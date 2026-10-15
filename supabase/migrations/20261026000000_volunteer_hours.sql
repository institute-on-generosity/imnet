-- F-081 Volunteer hours. A donor logs hours they volunteered with an org (private, like gifts);
-- opting in shows the total and hours per organization on their profile. Self-reported.
create table volunteer_hours (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references profiles on delete cascade,
  org_id     uuid not null references orgs on delete cascade,
  hours      numeric(4,1) not null check (hours > 0 and hours <= 24),
  served_on  date not null check (served_on <= current_date),
  note       text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index volunteer_hours_user on volunteer_hours (user_id, served_on desc);
alter table volunteer_hours enable row level security;
create policy "hours own" on volunteer_hours for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and org_is_visible(org_id));

alter table profiles add column show_volunteer_hours boolean not null default false;
grant update (show_volunteer_hours) on profiles to authenticated;

create function volunteer_summary(target uuid)
returns table (id uuid, slug text, name text, logo_url text, org_type org_type, hours numeric, since date)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug::text, o.name, o.logo_url, o.org_type, sum(v.hours), min(v.served_on)
    from volunteer_hours v join orgs o on o.id = v.org_id join profiles p on p.id = v.user_id
   where v.user_id = target and p.show_volunteer_hours and org_is_visible(o.id)
   group by o.id
   order by 6 desc, o.name
$$;
