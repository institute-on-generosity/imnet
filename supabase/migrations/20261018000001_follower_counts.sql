-- Follower counts for several orgs at once (post headers show "N followers", as on LinkedIn;
-- org follower counts were already public on profiles). Visible orgs only.
create function follower_counts(targets uuid[]) returns table (org_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select t, (select count(*) from follows f where f.org_id = t)
    from unnest(targets) t
   where org_is_visible(t)
$$;
