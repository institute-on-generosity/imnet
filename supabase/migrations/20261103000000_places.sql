-- F-101 Places for the "Near you" map. A small built-in city table turns "City, ST" into
-- coordinates (no outside geocoding service); orgs and communities pick them up from their
-- location text, and events start at their org's spot. Viewers' locations are never stored:
-- the map computes distances in the browser.
create table cities (
  name text primary key,          -- "Oakland, CA"
  lat  double precision not null check (lat between -90 and 90),
  lng  double precision not null check (lng between -180 and 180)
);
alter table cities enable row level security;
create policy "cities read" on cities for select using (true);
revoke insert, update, delete on cities from anon, authenticated;

insert into cities (name, lat, lng) values
 ('Albuquerque, NM', 35.0844, -106.6504), ('Ann Arbor, MI', 42.2808, -83.7430), ('Asheville, NC', 35.5951, -82.5515),
 ('Atlanta, GA', 33.7490, -84.3880), ('Austin, TX', 30.2672, -97.7431), ('Baltimore, MD', 39.2904, -76.6122),
 ('Berkeley, CA', 37.8715, -122.2730), ('Boise, ID', 43.6150, -116.2023), ('Boston, MA', 42.3601, -71.0589),
 ('Boulder, CO', 40.0150, -105.2705), ('Brooklyn, NY', 40.6782, -73.9442), ('Buffalo, NY', 42.8864, -78.8784),
 ('Burlington, VT', 44.4759, -73.2121), ('Charleston, SC', 32.7765, -79.9311), ('Charlotte, NC', 35.2271, -80.8431),
 ('Chicago, IL', 41.8781, -87.6298), ('Cincinnati, OH', 39.1031, -84.5120), ('Cleveland, OH', 41.4993, -81.6944),
 ('Columbus, OH', 39.9612, -82.9988), ('Dallas, TX', 32.7767, -96.7970), ('Davenport, IA', 41.5236, -90.5776),
 ('Denver, CO', 39.7392, -104.9903), ('Detroit, MI', 42.3314, -83.0458), ('Durham, NC', 35.9940, -78.8986),
 ('El Paso, TX', 31.7619, -106.4850), ('Eugene, OR', 44.0521, -123.0868), ('Fresno, CA', 36.7378, -119.7871),
 ('Hartford, CT', 41.7658, -72.6734), ('Honolulu, HI', 21.3069, -157.8583), ('Houston, TX', 29.7604, -95.3698),
 ('Indianapolis, IN', 39.7684, -86.1581), ('Jacksonville, FL', 30.3322, -81.6557), ('Kansas City, MO', 39.0997, -94.5786),
 ('Las Vegas, NV', 36.1699, -115.1398), ('Long Beach, CA', 33.7701, -118.1937), ('Los Angeles, CA', 34.0522, -118.2437),
 ('Louisville, KY', 38.2527, -85.7585), ('Lowell, MA', 42.6334, -71.3162), ('Madison, WI', 43.0731, -89.4012),
 ('Memphis, TN', 35.1495, -90.0490), ('Miami, FL', 25.7617, -80.1918), ('Milwaukee, WI', 43.0389, -87.9065),
 ('Minneapolis, MN', 44.9778, -93.2650), ('Nashville, TN', 36.1627, -86.7816), ('New Haven, CT', 41.3083, -72.9279),
 ('New Orleans, LA', 29.9511, -90.0715), ('New York, NY', 40.7128, -74.0060), ('Newark, NJ', 40.7357, -74.1724),
 ('Oakland, CA', 37.8044, -122.2712), ('Oklahoma City, OK', 35.4676, -97.5164), ('Omaha, NE', 41.2565, -95.9345),
 ('Orlando, FL', 28.5383, -81.3792), ('Philadelphia, PA', 39.9526, -75.1652), ('Phoenix, AZ', 33.4484, -112.0740),
 ('Pittsburgh, PA', 40.4406, -79.9959), ('Portland, ME', 43.6591, -70.2568), ('Portland, OR', 45.5152, -122.6784),
 ('Portsmouth, NH', 43.0718, -70.7626), ('Providence, RI', 41.8240, -71.4128), ('Raleigh, NC', 35.7796, -78.6382),
 ('Richmond, VA', 37.5407, -77.4360), ('Rochester, NY', 43.1566, -77.6088), ('Sacramento, CA', 38.5816, -121.4944),
 ('Salt Lake City, UT', 40.7608, -111.8910), ('San Antonio, TX', 29.4241, -98.4936), ('San Diego, CA', 32.7157, -117.1611),
 ('San Francisco, CA', 37.7749, -122.4194), ('San Jose, CA', 37.3382, -121.8863), ('Santa Fe, NM', 35.6870, -105.9378),
 ('Savannah, GA', 32.0809, -81.0912), ('Seattle, WA', 47.6062, -122.3321), ('Spokane, WA', 47.6588, -117.4260),
 ('St. Louis, MO', 38.6270, -90.1994), ('St. Paul, MN', 44.9537, -93.0900), ('Tacoma, WA', 47.2529, -122.4443),
 ('Tampa, FL', 27.9506, -82.4572), ('Tucson, AZ', 32.2226, -110.9747), ('Tulsa, OK', 36.1540, -95.9928),
 ('Washington, DC', 38.9072, -77.0369), ('Wichita, KS', 37.6872, -97.3301), ('Worcester, MA', 42.2626, -71.8023);

alter table orgs add column lat double precision, add column lng double precision;
alter table groups add column location text check (char_length(location) <= 80), add column lat double precision, add column lng double precision;
alter table org_events add column lat double precision, add column lng double precision;

-- Location text -> coordinates, when it's a city we know.
create function place_from_location() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.location is distinct from old.location then
    select c.lat, c.lng into new.lat, new.lng from cities c where lower(c.name) = lower(btrim(new.location));
  end if;
  return new;
end $$;
create trigger orgs_place before insert or update of location on orgs for each row execute function place_from_location();
create trigger groups_place before insert or update of location on groups for each row execute function place_from_location();

-- New events start at their org's spot.
create function event_place() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lat is null then select o.lat, o.lng into new.lat, new.lng from orgs o where o.id = new.org_id; end if;
  return new;
end $$;
create trigger org_events_place before insert on org_events for each row execute function event_place();

-- Existing rows.
update orgs o set lat = c.lat, lng = c.lng from cities c where lower(c.name) = lower(btrim(o.location));
update org_events e set lat = o.lat, lng = o.lng from orgs o where o.id = e.org_id and e.lat is null;
