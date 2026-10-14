-- F-051 Current needs: concrete asks an org posts (an item, volunteers, or funds), each with a way to help.
create table org_needs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs on delete cascade,
  kind       text not null check (kind in ('item', 'volunteer', 'funding')),
  title      text not null check (char_length(title) between 3 and 120),
  detail     text check (char_length(detail) <= 500),
  help_url   text not null check (help_url ~ '^(https?://|mailto:)'),
  met_at     timestamptz,
  created_at timestamptz not null default now()
);
create index org_needs_org on org_needs (org_id, created_at desc);
alter table org_needs enable row level security;
create policy "needs read"  on org_needs for select using (org_is_visible(org_id));
create policy "needs write" on org_needs for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- F-052 Giving journal: a donor's private record of gifts they made. Never shown to anyone else.
create table gifts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references profiles on delete cascade,
  org_id     uuid not null references orgs on delete cascade,
  amount_usd integer not null check (amount_usd between 1 and 10000000),
  given_on   date not null check (given_on <= current_date),
  note       text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index gifts_user on gifts (user_id, given_on desc);
alter table gifts enable row level security;
create policy "gifts own" on gifts for all using (user_id = auth.uid()) with check (user_id = auth.uid() and org_is_visible(org_id));

-- F-053 Thank-you notes: private encouragement from a donor to an org's staff. No public count.
create table thanks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs on delete cascade,
  user_id    uuid not null default auth.uid() references profiles on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index thanks_org on thanks (org_id, created_at desc);
alter table thanks enable row level security;
create policy "thanks insert" on thanks for insert with check (user_id = auth.uid() and org_is_visible(org_id));
create policy "thanks read"   on thanks for select using (user_id = auth.uid() or is_org_member(org_id));
create policy "thanks delete" on thanks for delete using (user_id = auth.uid() or is_org_member(org_id));
