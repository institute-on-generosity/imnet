-- F-100 Member counts for group cards, readable without signing in (like follower counts).
create function group_member_counts(targets uuid[]) returns table (group_id uuid, members bigint)
language sql stable security definer set search_path = public as $$
  select g, (select count(*) from group_members where group_id = g) from unnest(targets) g
$$;
grant execute on function group_member_counts(uuid[]) to anon, authenticated;
