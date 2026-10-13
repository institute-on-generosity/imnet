-- Nonprofits and foundations look different across the app. Type is set at claim time and
-- changed only by admins (not in the staff-editable column grant on orgs).

create type org_type as enum ('nonprofit', 'foundation');

alter table orgs       add column org_type org_type not null default 'nonprofit';
alter table org_claims add column org_type org_type not null default 'nonprofit';

create or replace function approve_claim(claim uuid, new_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c   org_claims;
  oid uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select * into c from org_claims where id = claim and status = 'pending' for update;
  if not found then raise exception 'claim not found or already reviewed'; end if;

  select id into oid from orgs where ein = c.ein;
  if oid is null then
    insert into orgs (slug, name, ein, website, org_type, status)
    values (new_slug, c.org_name, c.ein, c.website, c.org_type, 'verified')
    returning id into oid;
  end if;

  insert into org_members (org_id, user_id) values (oid, c.user_id) on conflict do nothing;
  update org_claims
     set status = 'approved', org_id = oid, reviewed_by = auth.uid(), reviewed_at = now()
   where id = claim;
  return oid;
end $$;
