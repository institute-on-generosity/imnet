-- Multimedia posts: every photo needs alt text; credits are optional (required for licensed seed photos).

alter table posts
  add column image_alts    text[] not null default '{}',
  add column image_credits text[] not null default '{}',
  add constraint images_max_four    check (cardinality(image_paths) <= 4),
  add constraint images_have_alts   check (cardinality(image_alts) = cardinality(image_paths)
                                           and not ('' = any (image_alts))),
  add constraint images_credit_each check (cardinality(image_credits) in (0, cardinality(image_paths)));

-- Uploads: images only, 5 MB each.
update storage.buckets
   set file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'post-images';
