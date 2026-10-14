-- Org logos live in post-images too; the cleanup must not treat them as orphaned uploads.
create or replace function orphan_post_images(min_age interval default interval '1 day')
returns table (name text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'post-images'
     and o.created_at < now() - min_age
     and not exists (select 1 from public.posts p where o.name = any (p.image_paths))
     and not exists (select 1 from public.orgs g where g.logo_url like '%/post-images/' || o.name)
$$;
