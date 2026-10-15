-- F-099 Donations through imnet (test mode). Only successful charges are recorded. A donor sees
-- their own; an org's staff see gifts to their org through org_donations(), which hides the name of
-- anyone who gave anonymously. No card numbers: brand and last four only.
create table donations (
  id           uuid primary key default gen_random_uuid(),
  donor_id     uuid not null default auth.uid() references profiles on delete cascade,
  org_id       uuid not null references orgs on delete cascade,
  amount_cents integer not null check (amount_cents between 100 and 10000000),
  fee_cents    integer not null default 0 check (fee_cents between 0 and 1000000),
  monthly      boolean not null default false,
  anonymous    boolean not null default false,
  provider     text not null default 'test' check (provider = 'test'),
  provider_ref text not null check (provider_ref ~ '^pi_test_[0-9a-f]{24}$'),
  card_brand   text not null check (card_brand in ('Visa', 'Mastercard', 'Amex', 'Discover', 'Card')),
  card_last4   text not null check (card_last4 ~ '^[0-9]{4}$'),
  created_at   timestamptz not null default now()
);
create index donations_org on donations (org_id, created_at desc);
create index donations_donor on donations (donor_id, created_at desc);
alter table donations enable row level security;
create policy "donations own read" on donations for select using (donor_id = auth.uid());
create policy "donations own insert" on donations for insert
  with check (donor_id = auth.uid() and org_is_visible(org_id));
-- Created at the moment of the charge (signed-in requests can't backdate, as with posts, B-038).
create function donations_pin_time() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.created_at := now(); end if;
  return new;
end $$;
create trigger donations_pin_time before insert on donations for each row execute function donations_pin_time();

-- Staff view: amount, when, monthly, and the donor's name unless they chose anonymous.
create function org_donations(target uuid, lim int default 50)
returns table (id uuid, amount_cents integer, monthly boolean, created_at timestamptz, donor_name text, donor_handle text, donor_avatar text)
language sql stable security definer set search_path = public as $$
  select d.id, d.amount_cents, d.monthly, d.created_at,
         case when d.anonymous then null else coalesce(p.display_name, '@' || p.handle) end,
         case when d.anonymous then null else p.handle::text end,
         case when d.anonymous then null else p.avatar_url end
    from donations d join profiles p on p.id = d.donor_id
   where d.org_id = target and (is_org_member(target) or is_admin())
   order by d.created_at desc
   limit least(greatest(lim, 1), 200)
$$;
revoke all on function org_donations(uuid, int) from public;
grant execute on function org_donations(uuid, int) to authenticated;
