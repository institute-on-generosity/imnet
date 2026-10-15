-- F-079 Donor posts: people post too (spreading awareness, why they give), optionally
-- spotlighting a nonprofit or foundation. Same table, so comments, Moved, Save and Share work.
-- A donor post has no org_id; its author is the person. Text only (no uploads) for now.
alter table posts alter column org_id drop not null;
alter table posts add column about_org_id uuid references orgs on delete set null;
alter table posts add constraint donor_post_shape check (
  org_id is not null
  or (author_id is not null and kind = 'update' and cardinality(image_paths) = 0 and video_path is null
      and embed_url is null and reports_grant_id is null and call_deadline is null)
);
create index posts_author_idx on posts (author_id, created_at desc) where org_id is null;

drop policy "posts read" on posts;
drop policy "posts insert" on posts;
drop policy "posts update" on posts;
drop policy "posts delete" on posts;

create policy "posts read" on posts for select using (
  (published and org_id is not null and org_is_visible(org_id))
  or (published and org_id is null)
  or (org_id is null and author_id = auth.uid())
  or is_org_member(org_id) or is_admin()
);
create policy "posts insert" on posts for insert with check (
  author_id = auth.uid() and (
    is_org_member(org_id)
    or (org_id is null and (about_org_id is null or org_is_visible(about_org_id)))
  )
);
create policy "posts update" on posts for update
  using (is_org_member(org_id) or is_admin() or (org_id is null and author_id = auth.uid()))
  with check (is_org_member(org_id) or is_admin() or (org_id is null and author_id = auth.uid()));
create policy "posts delete" on posts for delete
  using (is_org_member(org_id) or is_admin() or (org_id is null and author_id = auth.uid()));
