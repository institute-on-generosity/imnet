-- F-086 Follow people. Like org follows, these are private: you see who you follow; nobody sees
-- anyone's follower list or count (no popularity contest). Followed people's posts reach your
-- Following feed.
create table person_follows (
  follower_id uuid not null default auth.uid() references profiles on delete cascade,
  followee_id uuid not null references profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index person_follows_followee on person_follows (followee_id);
alter table person_follows enable row level security;
create policy "person follows own" on person_follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
