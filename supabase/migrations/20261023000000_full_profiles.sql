-- F-073 Full profiles: cover photos and the details real organizations and people show.

-- Organizations: cover (a storage path in the org's own folder, like logos after B-019) and details.
alter table orgs
  add column cover_url    text,
  add column about        text check (char_length(about) <= 2000),
  add column location     text check (char_length(location) <= 80),
  add column founded_year integer check (founded_year between 1800 and 2100),
  add column team_size    text check (char_length(team_size) <= 80),
  add column programs     text[] not null default '{}'
    check (cardinality(programs) <= 8 and char_length(array_to_string(programs, '')) <= 480);
alter table orgs add constraint cover_is_own_storage_path
  check (cover_url is null or cover_url ~ ('^' || id::text || '/cover(-[0-9a-f-]{36})?\.(png|jpg|jpeg|webp)$'));
grant update (cover_url, about, location, founded_year, team_size, programs) on orgs to authenticated;

-- People: location, a longer About, and a cover chosen from the shared set (no uploads, so no
-- other host and no unreviewed images).
alter table profiles
  add column location  text check (char_length(location) <= 80),
  add column about     text check (char_length(about) <= 2000),
  add column cover_url text check (cover_url is null or cover_url ~ '^covers/[a-z0-9-]{1,40}\.webp$');
grant update (location, about, cover_url) on profiles to authenticated;

-- Upload cleanup (F-031) keeps covers in use and the shared cover set.
create or replace function orphan_post_images(min_age interval default interval '1 day')
returns table (name text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'post-images'
     and o.created_at < now() - min_age
     and o.name not like 'covers/%'
     and not exists (select 1 from public.posts p where o.name = any (p.image_paths))
     and not exists (select 1 from public.orgs g where g.logo_url = o.name or g.cover_url = o.name)
$$;
