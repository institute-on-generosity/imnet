-- F-058 Events: volunteer days, open houses and gatherings an org hosts. RSVPs are private:
-- the donor and the org's staff see them; the public sees no counts.
create table org_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs on delete cascade,
  title       text not null check (char_length(title) between 3 and 120),
  starts_at   timestamptz not null,
  location    text not null check (char_length(location) between 2 and 200),
  detail      text check (char_length(detail) <= 1000),
  created_at  timestamptz not null default now()
);
create index org_events_upcoming on org_events (starts_at);
create index org_events_org on org_events (org_id, starts_at);
alter table org_events enable row level security;
create policy "events read"  on org_events for select using (org_is_visible(org_id));
create policy "events write" on org_events for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create table event_rsvps (
  event_id   uuid references org_events on delete cascade,
  user_id    uuid references profiles on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table event_rsvps enable row level security;
create function event_org(target uuid) returns uuid language sql stable security definer set search_path = public as $$
  select org_id from org_events where id = target
$$;
create policy "rsvp own" on event_rsvps for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from org_events e where e.id = event_id and e.starts_at > now()));
create policy "rsvp staff read" on event_rsvps for select using (is_org_member(event_org(event_id)));

-- F-059 Volunteer interest: "I'm interested" on a volunteer need. Seen only by the donor and the org's staff.
create table need_interest (
  need_id    uuid references org_needs on delete cascade,
  user_id    uuid references profiles on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (need_id, user_id)
);
alter table need_interest enable row level security;
create function need_org(target uuid) returns uuid language sql stable security definer set search_path = public as $$
  select org_id from org_needs where id = target
$$;
create policy "interest own" on need_interest for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from org_needs n where n.id = need_id and n.kind = 'volunteer' and n.met_at is null));
create policy "interest staff read" on need_interest for select using (is_org_member(need_org(need_id)));
