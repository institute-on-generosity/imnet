-- F-062 Comments on posts. Public on public posts, oldest first, no likes and no counts.
-- The posting org's staff can reply as the org and remove any comment on their posts.
create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts on delete cascade,
  user_id    uuid not null default auth.uid() references profiles on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  as_org     boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post on comments (post_id, created_at);
alter table comments enable row level security;

create function post_org(target uuid) returns uuid language sql stable security definer set search_path = public as $$
  select org_id from posts where id = target
$$;

-- Readable whenever the post is (posts RLS decides).
create policy "comments read" on comments for select using (exists (select 1 from posts p where p.id = post_id));
create policy "comments insert" on comments for insert with check (
  user_id = auth.uid()
  and exists (select 1 from posts p where p.id = post_id)
  and (not as_org or is_org_member(post_org(post_id)))
);
create policy "comments delete" on comments for delete using (
  user_id = auth.uid() or is_org_member(post_org(post_id)) or is_admin()
);
