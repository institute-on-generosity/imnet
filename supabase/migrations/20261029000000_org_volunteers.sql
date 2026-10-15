-- F-090 Who volunteers here. People whose hours the org confirmed AND who chose to show their
-- volunteer hours (F-081 opt-in). Nobody else is counted or shown. You first, then people you follow.
create function org_volunteers(target uuid, lim int default 3)
returns table (id uuid, handle text, display_name text, avatar_url text, total bigint)
language sql stable security definer set search_path = public as $$
  with v as (
    select p.id, p.handle::text, p.display_name, p.avatar_url, max(h.confirmed_at) last_at,
           exists (select 1 from person_follows f where f.follower_id = auth.uid() and f.followee_id = p.id) followed
      from volunteer_hours h join profiles p on p.id = h.user_id
     where h.org_id = target and h.confirmed_at is not null and p.show_volunteer_hours and org_is_visible(target)
     group by p.id
  )
  select id, handle, display_name, avatar_url, count(*) over () from v
   order by id = auth.uid() desc, followed desc, last_at desc
   limit greatest(lim, 1)
$$;
revoke all on function org_volunteers(uuid, int) from public;
grant execute on function org_volunteers(uuid, int) to anon, authenticated;
