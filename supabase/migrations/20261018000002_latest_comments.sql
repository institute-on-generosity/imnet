-- F-064 Feed comment preview: the newest top-level comment on each of these posts.
-- more: whether the thread has anything else (a yes/no, never a count). security invoker (default), so comments and posts RLS still apply.
create function latest_comments(post_ids uuid[])
returns table (id uuid, post_id uuid, parent_id uuid, body text, as_org boolean, created_at timestamptz, user_id uuid, handle text, display_name text, bio text, more boolean)
language sql stable as $$
  select distinct on (c.post_id) c.id, c.post_id, c.parent_id, c.body, c.as_org, c.created_at, c.user_id, p.handle::text, p.display_name, p.bio,
         exists (select 1 from comments o where o.post_id = c.post_id and o.id <> c.id) as more
    from comments c join profiles p on p.id = c.user_id
   where c.post_id = any (post_ids) and c.parent_id is null
   order by c.post_id, c.created_at desc
$$;
