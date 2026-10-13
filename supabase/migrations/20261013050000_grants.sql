-- Grants: a foundation funds a nonprofit. The foundation records it (optionally tagged on a post);
-- the nonprofit confirms it. Only confirmed grants are public (principle #1: no fabrication).

create table grants (
  id            uuid primary key default gen_random_uuid(),
  foundation_id uuid not null references orgs on delete cascade,
  grantee_id    uuid not null references orgs on delete cascade,
  post_id       uuid references posts on delete set null,
  amount_usd    integer check (amount_usd between 1 and 1000000000),
  purpose       text check (char_length(purpose) <= 200),
  awarded_on    date not null default current_date,
  confirmed_at  timestamptz,
  created_by    uuid references profiles on delete set null,
  created_at    timestamptz not null default now(),
  constraint grant_not_self check (foundation_id <> grantee_id),
  constraint grant_once_per_post unique (post_id, grantee_id)
);
create index grants_grantee_idx on grants (grantee_id);
create index grants_foundation_idx on grants (foundation_id);
create index grants_post_idx on grants (post_id);

-- Funder must be a foundation, grantee a nonprofit. Editing the substance un-confirms it.
create function check_grant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select org_type from orgs where id = new.foundation_id) <> 'foundation' then
    raise exception 'grants are given by foundations';
  end if;
  if (select org_type from orgs where id = new.grantee_id) <> 'nonprofit' then
    raise exception 'grants go to nonprofits';
  end if;
  if tg_op = 'UPDATE' and (new.amount_usd, new.purpose, new.grantee_id, new.awarded_on)
                      is distinct from (old.amount_usd, old.purpose, old.grantee_id, old.awarded_on) then
    new.confirmed_at := null;
  end if;
  return new;
end $$;

create trigger grants_check before insert or update on grants
  for each row execute function check_grant();

-- The grantee's staff confirm a grant (the only way confirmed_at gets set).
create function confirm_grant(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update grants set confirmed_at = now()
   where id = target and is_org_member(grantee_id) and confirmed_at is null;
  if not found then raise exception 'grant not found, already confirmed, or not yours to confirm'; end if;
end $$;

alter table grants enable row level security;

create policy "grants read" on grants for select using (
  (confirmed_at is not null and org_is_visible(foundation_id) and org_is_visible(grantee_id))
  or is_org_member(foundation_id) or is_org_member(grantee_id) or is_admin()
);
create policy "grants insert" on grants for insert
  with check (is_org_member(foundation_id) and created_by = auth.uid() and confirmed_at is null);
create policy "grants update" on grants for update
  using (is_org_member(foundation_id)) with check (is_org_member(foundation_id));
-- Either side can remove it ("not ours" from the grantee).
create policy "grants delete" on grants for delete
  using (is_org_member(foundation_id) or is_org_member(grantee_id));

revoke update on grants from authenticated, anon;
grant update (amount_usd, purpose, awarded_on, post_id) on grants to authenticated;
