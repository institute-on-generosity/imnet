-- F-070 Avatars: avatar_url is only our own illustrated-avatar route ("/avatars/<seed>").
-- Users can already update avatar_url, so without this it could point at any host (as logos
-- could before B-019).
update profiles set avatar_url = null where avatar_url is not null and avatar_url !~ '^/avatars/[a-z0-9_-]{1,40}$';
alter table profiles add constraint avatar_is_own_route check (avatar_url is null or avatar_url ~ '^/avatars/[a-z0-9_-]{1,40}$');

-- Feed comment preview carries the commenter's avatar too.
drop function latest_comments(uuid[]);
create function latest_comments(post_ids uuid[])
returns table (id uuid, post_id uuid, parent_id uuid, body text, as_org boolean, created_at timestamptz, user_id uuid, handle text, display_name text, bio text, avatar_url text, more boolean, donor boolean)
language sql stable as $$
  select distinct on (c.post_id) c.id, c.post_id, c.parent_id, c.body, c.as_org, c.created_at, c.user_id, p.handle::text, p.display_name, p.bio, p.avatar_url,
         exists (select 1 from comments o where o.post_id = c.post_id and o.id <> c.id) as more,
         donor(c)
    from comments c join profiles p on p.id = c.user_id
   where c.post_id = any (post_ids) and c.parent_id is null
   order by c.post_id, c.created_at desc
$$;
