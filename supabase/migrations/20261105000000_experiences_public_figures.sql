-- F-111 Experiences: "I volunteered / gave / went here", with a short note. Shared only with people
-- who follow you (and you), never public and never counted, like a friend's recommendation.
create type experience_kind as enum ('volunteered', 'gave', 'attended');
create table experiences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references profiles on delete cascade,
  org_id     uuid not null references orgs on delete cascade,
  kind       experience_kind not null,
  note       text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (user_id, org_id, kind)
);
create index experiences_org on experiences (org_id, created_at desc);
alter table experiences enable row level security;
create policy "experiences read" on experiences for select using (
  user_id = auth.uid() or exists (select 1 from person_follows f where f.follower_id = auth.uid() and f.followee_id = user_id)
);
create policy "experiences write" on experiences for insert with check (user_id = auth.uid() and org_is_visible(org_id));
create policy "experiences edit" on experiences for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "experiences delete" on experiences for delete using (user_id = auth.uid());
create trigger experiences_stamp before insert on experiences for each row execute function stamp_now();

-- F-113 Public figures: people whose giving others want to follow. Admin-verified (people can't
-- grant it to themselves; no column grant), and their giving shows only if they opt in as anyone
-- else (show_giving_totals).
alter table profiles add column public_figure boolean not null default false,
  add column public_figure_note text check (char_length(public_figure_note) <= 80);
