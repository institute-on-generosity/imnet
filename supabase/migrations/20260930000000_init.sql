-- imnet Phase I schema: the network.
-- Every table has RLS on. Access rules live here, not only in app code.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type org_status   as enum ('pending', 'verified', 'suspended');
create type claim_status as enum ('pending', 'approved', 'rejected');
create type post_kind    as enum ('update', 'impact_story', 'ask');
create type report_status as enum ('open', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  handle       citext unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text,
  bio          text check (char_length(bio) <= 500),
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table causes (
  slug text primary key,
  name text not null
);

create table profile_causes (
  user_id    uuid references profiles on delete cascade,
  cause_slug text references causes on delete cascade,
  primary key (user_id, cause_slug)
);

-- ---------------------------------------------------------------------------
-- Nonprofits
-- ---------------------------------------------------------------------------
create table orgs (
  id              uuid primary key default gen_random_uuid(),
  slug            citext unique not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name            text not null,
  ein             text unique check (ein ~ '^\d{2}-?\d{7}$'),
  website         text,
  mission         text,
  what_gifts_fund text,
  logo_url        text,
  everyorg_slug   text,           -- donate embed target
  status          org_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create table org_members (
  org_id     uuid references orgs on delete cascade,
  user_id    uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table org_causes (
  org_id     uuid references orgs on delete cascade,
  cause_slug text references causes on delete cascade,
  primary key (org_id, cause_slug)
);

-- Impact numbers shown on a profile. A source link is required (no fabrication).
create table impact_stats (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs on delete cascade,
  label      text not null,
  value      text not null,
  source_url text not null check (source_url ~ '^https?://'),
  as_of      date,
  sort       int not null default 0
);

-- A staff member asks to represent an org. Admin approves -> org + membership.
create table org_claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  org_name    text not null,
  ein         text not null check (ein ~ '^\d{2}-?\d{7}$'),
  website     text not null,
  work_email  text not null,
  note        text,
  status      claim_status not null default 'pending',
  org_id      uuid references orgs on delete set null,
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table posts (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs on delete cascade,
  author_id           uuid references profiles on delete set null,
  kind                post_kind not null default 'update',
  body                text not null check (char_length(body) between 1 and 5000),
  embed_url           text,                     -- normalized YouTube/Vimeo/Instagram embed
  image_paths         text[] not null default '{}',
  beneficiary_consent boolean not null default false,
  published           boolean not null default true,
  created_at          timestamptz not null default now(),
  -- Photos may show beneficiaries: staff must confirm consent.
  constraint images_need_consent check (cardinality(image_paths) = 0 or beneficiary_consent)
);
create index posts_feed_idx on posts (created_at desc) where published;
create index posts_org_idx  on posts (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Network
-- ---------------------------------------------------------------------------
create table follows (
  user_id    uuid references profiles on delete cascade,
  org_id     uuid references orgs on delete cascade,
  supporter  boolean not null default false,   -- self-declared, shown on public profile
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
create index follows_org_idx on follows (org_id);

-- Private "this moved me". Never shown publicly; orgs see only an aggregate.
create table moved (
  user_id    uuid references profiles on delete cascade,
  post_id    uuid references posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts on delete cascade,
  reporter_id uuid not null references profiles on delete cascade,
  reason      text not null check (char_length(reason) <= 1000),
  status      report_status not null default 'open',
  created_at  timestamptz not null default now()
);

create table events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('view', 'share', 'donate_click')),
  org_id     uuid references orgs on delete cascade,
  post_id    uuid references posts on delete cascade,
  user_id    uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);
create index events_org_idx on events (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so RLS policies can call them without recursion)
-- ---------------------------------------------------------------------------
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create function is_org_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = target and user_id = auth.uid())
$$;

create function org_is_visible(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from orgs where id = target and status = 'verified')
      or is_org_member(target) or is_admin()
$$;

-- Aggregate "moved" count, visible only to the org's staff.
create function moved_count(target_post uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select case
    when is_org_member((select org_id from posts where id = target_post)) or is_admin()
    then (select count(*) from moved where post_id = target_post)
  end
$$;

-- Public follower count without exposing who follows.
create function follower_count(target uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select case when org_is_visible(target)
    then (select count(*) from follows where org_id = target)
  end
$$;

-- Admin approves a claim: create (or attach to) the org and add the claimant as staff.
create function approve_claim(claim uuid, new_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c   org_claims;
  oid uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select * into c from org_claims where id = claim and status = 'pending' for update;
  if not found then raise exception 'claim not found or already reviewed'; end if;

  select id into oid from orgs where ein = c.ein;
  if oid is null then
    insert into orgs (slug, name, ein, website, status)
    values (new_slug, c.org_name, c.ein, c.website, 'verified')
    returning id into oid;
  end if;

  insert into org_members (org_id, user_id) values (oid, c.user_id) on conflict do nothing;
  update org_claims
     set status = 'approved', org_id = oid, reviewed_by = auth.uid(), reviewed_at = now()
   where id = claim;
  return oid;
end $$;

-- New auth user -> profile with a generated handle.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
begin
  if char_length(base) < 3 then base := 'giver'; end if;
  insert into profiles (id, handle, display_name)
  values (new.id, left(base, 22) || '_' || substr(md5(new.id::text), 1, 6), split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles       enable row level security;
alter table causes         enable row level security;
alter table profile_causes enable row level security;
alter table orgs           enable row level security;
alter table org_members    enable row level security;
alter table org_causes     enable row level security;
alter table impact_stats   enable row level security;
alter table org_claims     enable row level security;
alter table posts          enable row level security;
alter table follows        enable row level security;
alter table moved          enable row level security;
alter table reports        enable row level security;
alter table events         enable row level security;

-- profiles: public read, owner edits (but never is_admin; see column grants below)
create policy "profiles read"   on profiles for select using (true);
create policy "profiles update" on profiles for update using (id = auth.uid());
revoke update on profiles from authenticated, anon;
grant update (handle, display_name, bio, avatar_url) on profiles to authenticated;

create policy "causes read" on causes for select using (true);

create policy "profile_causes read"  on profile_causes for select using (true);
create policy "profile_causes write" on profile_causes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orgs: verified orgs are public; staff and admins see their own; creation via approve_claim
create policy "orgs read"   on orgs for select using (org_is_visible(id));
create policy "orgs update" on orgs for update using (is_org_member(id) or is_admin());
revoke update on orgs from authenticated, anon;
grant update (name, website, mission, what_gifts_fund, logo_url, everyorg_slug) on orgs to authenticated;

create policy "org_members read" on org_members for select using (is_org_member(org_id) or is_admin());

create policy "org_causes read"  on org_causes for select using (org_is_visible(org_id));
create policy "org_causes write" on org_causes for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "impact_stats read"  on impact_stats for select using (org_is_visible(org_id));
create policy "impact_stats write" on impact_stats for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "claims insert" on org_claims for insert with check (user_id = auth.uid() and status = 'pending');
create policy "claims read"   on org_claims for select using (user_id = auth.uid() or is_admin());
create policy "claims update" on org_claims for update using (is_admin());

-- posts: published posts of verified orgs are public; staff manage their org's posts
create policy "posts read" on posts for select
  using ((published and org_is_visible(org_id)) or is_org_member(org_id) or is_admin());
create policy "posts insert" on posts for insert
  with check (is_org_member(org_id) and author_id = auth.uid());
create policy "posts update" on posts for update
  using (is_org_member(org_id) or is_admin())
  with check (is_org_member(org_id) or is_admin());
create policy "posts delete" on posts for delete
  using (is_org_member(org_id) or is_admin());

-- follows: your own, plus anyone's declared support (public profiles)
create policy "follows read"  on follows for select using (user_id = auth.uid() or supporter);
create policy "follows write" on follows for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "moved own" on moved for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reports insert" on reports for insert with check (reporter_id = auth.uid());
create policy "reports read"   on reports for select using (is_admin());
create policy "reports update" on reports for update using (is_admin());

-- events: anyone may log; only the org's staff and admins read
create policy "events insert" on events for insert
  with check (user_id is null or user_id = auth.uid());
create policy "events read" on events for select using (is_org_member(org_id) or is_admin());

-- ---------------------------------------------------------------------------
-- Storage: post images, public read, org staff write under "<org_id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post-images staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and is_org_member(((storage.foldername(name))[1])::uuid));
create policy "post-images staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and is_org_member(((storage.foldername(name))[1])::uuid));
