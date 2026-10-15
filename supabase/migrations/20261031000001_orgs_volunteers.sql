-- B-039 Batched org_volunteers (F-090) for many orgs in one call: up to 3 people per org.
create function orgs_volunteers(targets uuid[])
returns table (org_id uuid, id uuid, handle text, display_name text, avatar_url text, total bigint)
language sql stable security definer set search_path = public as $$
  select t, v.* from unnest(targets) t cross join lateral org_volunteers(t, 3) v
$$;
revoke all on function orgs_volunteers(uuid[]) from public;
grant execute on function orgs_volunteers(uuid[]) to anon, authenticated;
