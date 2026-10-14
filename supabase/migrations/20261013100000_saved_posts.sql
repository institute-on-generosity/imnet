-- Private bookmarks. Nobody else sees what you saved; no counts anywhere.
create table saved_posts (
  user_id    uuid references profiles on delete cascade,
  post_id    uuid references posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table saved_posts enable row level security;
create policy "saved own" on saved_posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
