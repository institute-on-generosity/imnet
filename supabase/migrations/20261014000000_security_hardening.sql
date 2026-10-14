-- Security review follow-ups (B-018..B-021).

-- B-018: edited_at can't be set by hand (posts has no column grants). Any update keeps the old
-- stamp unless the text changed, so "Edited" can't be hidden or faked.
drop trigger posts_stamp_edit on posts;
create or replace function stamp_post_edit() returns trigger
language plpgsql as $$
begin
  new.edited_at := case when new.body is distinct from old.body then now() else old.edited_at end;
  return new;
end $$;
create trigger posts_stamp_edit before update on posts for each row execute function stamp_post_edit();

-- B-019: logos are a storage path in the org's own folder (not a URL), enforced here.
-- The app builds the public URL, so a logo can never point at another host.
update orgs set logo_url = regexp_replace(logo_url, '^.*/post-images/', '') where logo_url like '%/post-images/%';
update orgs set logo_url = null
 where logo_url is not null and logo_url !~ ('^' || id::text || '/logo(-[0-9a-f-]{36})?\.(png|jpg|jpeg|webp)$');
alter table orgs add constraint logo_is_own_storage_path
  check (logo_url is null or logo_url ~ ('^' || id::text || '/logo(-[0-9a-f-]{36})?\.(png|jpg|jpeg|webp)$'));

create or replace function orphan_post_images(min_age interval default interval '1 day')
returns table (name text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'post-images'
     and o.created_at < now() - min_age
     and not exists (select 1 from public.posts p where o.name = any (p.image_paths))
     and not exists (select 1 from public.orgs g where g.logo_url = o.name)
$$;

-- B-020: only a confirmed email can accept an invite.
create or replace function accept_org_invite(invite_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv org_invites;
  me  record;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select email, email_confirmed_at into me from auth.users where id = auth.uid();
  if me.email_confirmed_at is null then raise exception 'confirm your email address first'; end if;
  select * into inv from org_invites where token = invite_token for update;
  if not found then raise exception 'invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'invite already used'; end if;
  if lower(inv.email) <> lower(me.email) then raise exception 'this invite is for a different email address'; end if;
  insert into org_members (org_id, user_id) values (inv.org_id, auth.uid()) on conflict do nothing;
  update org_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.org_id;
end $$;

-- B-021: removing someone also revokes the invites they sent that are still pending.
create or replace function remove_org_member(target_org uuid, target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_org_member(target_org) then raise exception 'not your organization'; end if;
  if (select count(*) from org_members where org_id = target_org) <= 1 then
    raise exception 'an organization needs at least one member';
  end if;
  delete from org_members where org_id = target_org and user_id = target_user;
  delete from org_invites where org_id = target_org and invited_by = target_user and accepted_at is null;
end $$;
