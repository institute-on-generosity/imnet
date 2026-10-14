-- Team invites: staff invite colleagues by email; only that email can accept.
-- imnet doesn't send the email yet: staff copy the invite link and send it themselves.

create table org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs on delete cascade,
  email       citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid references profiles on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references profiles on delete set null,
  unique (org_id, email)
);
alter table org_invites enable row level security;

create policy "invites staff read"   on org_invites for select using (is_org_member(org_id) or is_admin());
create policy "invites staff create" on org_invites for insert
  with check (is_org_member(org_id) and invited_by = auth.uid() and accepted_at is null);
create policy "invites staff revoke" on org_invites for delete using (is_org_member(org_id) and accepted_at is null);

-- What an invite link shows before accepting (org name only; never other invites).
create function invite_preview(invite_token uuid) returns table (org_name text, org_slug citext, accepted boolean)
language sql stable security definer set search_path = public as $$
  select o.name, o.slug, i.accepted_at is not null from org_invites i join orgs o on o.id = i.org_id where i.token = invite_token
$$;

-- Accept: the signed-in user's email must match the invite.
create function accept_org_invite(invite_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv org_invites;
  my_email text := (select email from auth.users where id = auth.uid());
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into inv from org_invites where token = invite_token for update;
  if not found then raise exception 'invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'invite already used'; end if;
  if lower(inv.email) <> lower(my_email) then raise exception 'this invite is for a different email address'; end if;
  insert into org_members (org_id, user_id) values (inv.org_id, auth.uid()) on conflict do nothing;
  update org_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.org_id;
end $$;

-- Staff can remove a colleague (or leave), but an org always keeps at least one member.
create function remove_org_member(target_org uuid, target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_org_member(target_org) then raise exception 'not your organization'; end if;
  if (select count(*) from org_members where org_id = target_org) <= 1 then
    raise exception 'an organization needs at least one member';
  end if;
  delete from org_members where org_id = target_org and user_id = target_user;
end $$;
