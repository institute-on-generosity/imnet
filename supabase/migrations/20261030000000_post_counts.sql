-- F-094 Counts on the post action bar. Comment counts are public (the comments already are).
-- The "moved" count stays private: only the post's author, its org's staff and admins get it.
create function post_moved_count(target uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from posts where id = target and (author_id = auth.uid() or is_org_member(org_id))) or is_admin()
    then (select count(*) from moved where post_id = target)
  end
$$;

-- Invoker rights: RLS on posts and comments decides what's counted.
create function post_counts(post_ids uuid[]) returns table (post_id uuid, comments bigint, moved bigint)
language sql stable security invoker set search_path = public as $$
  select p.id, (select count(*) from comments c where c.post_id = p.id), post_moved_count(p.id)
    from posts p where p.id = any(post_ids)
$$;
grant execute on function post_moved_count(uuid), post_counts(uuid[]) to anon, authenticated;
