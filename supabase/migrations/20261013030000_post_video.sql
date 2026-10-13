-- Native video posts (autoplay in the feed). Files live in the post-videos bucket under "<org_id>/...".

alter table posts
  add column video_path        text,
  add column video_poster_path text,
  add column video_alt         text check (char_length(video_alt) <= 300),
  add column video_credit      text check (char_length(video_credit) <= 300),
  add constraint video_needs_alt     check (video_path is null or coalesce(video_alt, '') <> ''),
  add constraint one_video_per_post  check (video_path is null or embed_url is null),
  add constraint video_extras_need_video check (video_path is not null or (video_poster_path is null and video_credit is null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 50 * 1024 * 1024, array['video/webm', 'video/mp4', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "post-videos staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-videos' and is_org_member(((storage.foldername(name))[1])::uuid));
create policy "post-videos staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-videos' and is_org_member(((storage.foldername(name))[1])::uuid));
