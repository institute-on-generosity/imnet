-- Photos uploaded in the composer but never posted. Listed for the cleanup script
-- (npm run cleanup:uploads), which deletes them through the Storage API.
create function orphan_post_images(min_age interval default interval '1 day')
returns table (name text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'post-images'
     and o.created_at < now() - min_age
     and not exists (select 1 from public.posts p where o.name = any (p.image_paths))
$$;

-- Ops only: never callable from the app's anon or signed-in roles.
revoke execute on function orphan_post_images(interval) from public, anon, authenticated;
grant execute on function orphan_post_images(interval) to service_role;
