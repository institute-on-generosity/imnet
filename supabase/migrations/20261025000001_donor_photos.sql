-- F-080 Photos on donor posts. People upload to their own folder: post-images/people/<user id>/.
-- Same rules as org photos: up to 4, alt text each, consent confirmed.

-- Org-folder storage policies cast the first folder to a uuid; "people" isn't one, so check safely.
create function folder_is_my_org(folder text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return is_org_member(folder::uuid);
exception when invalid_text_representation then
  return false;
end $$;

drop policy "post-images staff write" on storage.objects;
drop policy "post-images staff delete" on storage.objects;
create policy "post-images staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and folder_is_my_org((storage.foldername(name))[1]));
create policy "post-images staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and folder_is_my_org((storage.foldername(name))[1]));
create policy "post-images own folder write" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'people' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "post-images own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'people' and (storage.foldername(name))[2] = auth.uid()::text);

-- Every path starts with the prefix (true for no paths).
create function paths_under(paths text[], prefix text) returns boolean
language sql immutable as $$ select coalesce(bool_and(starts_with(p, prefix)), true) from unnest(paths) p $$;

alter table posts drop constraint donor_post_shape;
alter table posts add constraint donor_post_shape check (
  org_id is not null
  or (author_id is not null and kind = 'update' and video_path is null and embed_url is null
      and reports_grant_id is null and call_deadline is null
      and paths_under(image_paths, 'people/' || author_id::text || '/'))
);
