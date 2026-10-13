-- Synthetic demo data. All orgs, people and numbers are fictional.

insert into causes (slug, name) values
  ('hunger',         'Hunger & Food'),
  ('housing',        'Housing & Homelessness'),
  ('education',      'Education'),
  ('health',         'Health'),
  ('environment',    'Environment'),
  ('youth',          'Youth'),
  ('animals',        'Animals'),
  ('arts',           'Arts & Culture'),
  ('refugees',       'Refugees & Immigrants'),
  ('mental-health',  'Mental Health')
on conflict do nothing;

insert into orgs (id, slug, name, ein, website, mission, what_gifts_fund, status) values
  ('00000000-0000-4000-a000-000000000001', 'harbor-table', 'Harbor Table (Demo)', '00-0000001',
   'https://example.org/harbor-table',
   'Neighborhood kitchens serving hot meals with dignity, no questions asked.',
   '$25 covers a week of dinners for one neighbor. $500 keeps a kitchen open for a night.',
   'verified'),
  ('00000000-0000-4000-a000-000000000002', 'open-door-homes', 'Open Door Homes (Demo)', '00-0000002',
   'https://example.org/open-door',
   'Moving families from shelters into stable homes, and staying with them after move-in.',
   '$100 furnishes a child''s bedroom. $1,000 covers a family''s first month of rent.',
   'verified'),
  ('00000000-0000-4000-a000-000000000003', 'riverbend-readers', 'Riverbend Readers (Demo)', '00-0000003',
   'https://example.org/riverbend',
   'One-on-one reading tutors for early readers in rural schools.',
   '$40 buys a take-home book set. $300 trains one volunteer tutor.',
   'verified'),
  ('00000000-0000-4000-a000-000000000004', 'greenway-stewards', 'Greenway Stewards (Demo)', '00-0000004',
   'https://example.org/greenway',
   'Volunteers restoring trails, rivers and open land in our county, one Saturday at a time.',
   '$30 buys gloves and hand tools for one volunteer. $250 covers native plants for 100 feet of riverbank.',
   'verified')
on conflict do nothing;

insert into orgs (id, slug, name, ein, website, mission, what_gifts_fund, status, org_type) values
  ('00000000-0000-4000-a000-000000000005', 'lakeshore-community-foundation', 'Lakeshore Community Foundation (Demo)', '00-0000005',
   'https://example.org/lakeshore',
   'A community foundation pooling local giving into grants for neighborhood nonprofits, with a focus on small groups that have no grant writer.',
   'Gifts to the Community Fund become grants. $1,000 funds a small nonprofit''s volunteer training; $10,000 funds a year of a program.',
   'verified', 'foundation')
on conflict do nothing;

insert into org_causes (org_id, cause_slug) values
  ('00000000-0000-4000-a000-000000000001', 'hunger'),
  ('00000000-0000-4000-a000-000000000002', 'housing'),
  ('00000000-0000-4000-a000-000000000002', 'youth'),
  ('00000000-0000-4000-a000-000000000003', 'education'),
  ('00000000-0000-4000-a000-000000000003', 'youth'),
  ('00000000-0000-4000-a000-000000000004', 'environment'),
  ('00000000-0000-4000-a000-000000000005', 'hunger'),
  ('00000000-0000-4000-a000-000000000005', 'housing'),
  ('00000000-0000-4000-a000-000000000005', 'education'),
  ('00000000-0000-4000-a000-000000000005', 'environment')
on conflict do nothing;

insert into impact_stats (org_id, label, value, source_url, as_of, sort) values
  ('00000000-0000-4000-a000-000000000001', 'Meals served', '48,200', 'https://example.org/harbor-table/annual-report', '2026-06-30', 0),
  ('00000000-0000-4000-a000-000000000001', 'Volunteer hours', '9,100', 'https://example.org/harbor-table/annual-report', '2026-06-30', 1),
  ('00000000-0000-4000-a000-000000000002', 'Families housed', '62', 'https://example.org/open-door/outcomes', '2026-06-30', 0),
  ('00000000-0000-4000-a000-000000000002', 'Still housed after 1 year', '91%', 'https://example.org/open-door/outcomes', '2026-06-30', 1),
  ('00000000-0000-4000-a000-000000000003', 'Students tutored', '310', 'https://example.org/riverbend/report', '2026-06-01', 0),
  ('00000000-0000-4000-a000-000000000003', 'Reading at grade level (from 38%)', '71%', 'https://example.org/riverbend/report', '2026-06-01', 1),
  ('00000000-0000-4000-a000-000000000004', 'Volunteer hours', '3,400', 'https://example.org/greenway/2026-report', '2026-09-01', 0),
  ('00000000-0000-4000-a000-000000000004', 'Miles of trail restored', '12', 'https://example.org/greenway/2026-report', '2026-09-01', 1),
  ('00000000-0000-4000-a000-000000000005', 'Granted in 2026', '$1.2M', 'https://example.org/lakeshore/grants-2026', '2026-09-30', 0),
  ('00000000-0000-4000-a000-000000000005', 'Local nonprofits funded', '48', 'https://example.org/lakeshore/grants-2026', '2026-09-30', 1);

-- Photos live in supabase/seed-images/post-images (loaded by `supabase seed buckets`); credits in seed-images/CREDITS.md.
insert into posts (org_id, kind, body, image_paths, image_alts, image_credits, beneficiary_consent, created_at) values
  ('00000000-0000-4000-a000-000000000001', 'impact_story', 'This summer our Eastside pantry welcomed its 10,000th family visit. Maria, a retired line cook, now leads Tuesday restocking and trains every new volunteer.',
   array['00000000-0000-4000-a000-000000000001/pantry-restock.jpg', '00000000-0000-4000-a000-000000000001/pantry-team.jpg']::text[], array['A volunteer restocking food pantry shelves with a box of canned goods', 'Volunteers in green shirts working together in a food pantry']::text[], array['USDAgov, public domain, via Wikimedia Commons', 'USDAgov, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '2 days'),
  ('00000000-0000-4000-a000-000000000001', 'update', 'This week''s grocery boxes went to 212 households: shelf-stable staples plus fresh produce from two local farms. Thank you to the 38 volunteers who packed them.',
   array['00000000-0000-4000-a000-000000000001/packing-boxes.jpg', '00000000-0000-4000-a000-000000000001/bagging-groceries.jpg']::text[], array['Volunteers packing grocery boxes labeled beans', 'A volunteer bagging groceries in a food bank warehouse']::text[], array['Chief Petty Officer Sarah Foster, public domain, via Wikimedia Commons', 'Chief Petty Officer Sarah Foster, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000001', 'ask', 'Our walk-in freezer is failing. A new one keeps 800 meals a week safe. We are $3,400 away.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '9 days'),
  ('00000000-0000-4000-a000-000000000001', 'update', 'Saturday''s neighborhood food drive brought in 3,100 cans. Volunteers sorted every one by lunchtime.',
   array['00000000-0000-4000-a000-000000000001/sorting-cans.jpg']::text[], array['Volunteers sorting donated canned food on outdoor tables']::text[], array['Mark Wolfe, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '16 days'),
  ('00000000-0000-4000-a000-000000000002', 'impact_story', 'The Okafor family got their keys on Friday. Three kids, three beds, one very happy dog. Our caseworker will check in weekly for the next six months.',
   array['00000000-0000-4000-a000-000000000002/keys-at-door.jpg']::text[], array['A hand holding house keys beside a door lock']::text[], array['Shixart1985, CC BY 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '1 days'),
  ('00000000-0000-4000-a000-000000000002', 'update', 'Repair crews patched three roofs this month, so three families could stay in homes they already own.',
   array['00000000-0000-4000-a000-000000000002/roof-repair.jpg']::text[], array['Volunteers repairing a damaged roof']::text[], array['Leif Skoogfors, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '12 days'),
  ('00000000-0000-4000-a000-000000000002', 'update', 'Quarterly numbers are in: 14 families moved from shelter to home this quarter, and every family from last year is still housed.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '20 days'),
  ('00000000-0000-4000-a000-000000000003', 'impact_story', 'In September, 42 second graders started with a tutor. Our volunteers set up the reading room the week before, and teachers already see more hands up during read-aloud.',
   array['00000000-0000-4000-a000-000000000003/arriving-at-school.jpg', '00000000-0000-4000-a000-000000000003/carrying-supplies.jpg']::text[], array['Two volunteers walking down a school hallway carrying supplies', 'A volunteer carrying a supply bin into a classroom storeroom']::text[], array['Nazareth College from Rochester, NY, USA, CC BY 2.0, via Wikimedia Commons', 'Nazareth College from Rochester, NY, USA, CC BY 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '4 days'),
  ('00000000-0000-4000-a000-000000000003', 'update', 'Take-home book sets are packed for the fall: each student picks three books to keep.',
   array['00000000-0000-4000-a000-000000000003/packing-book-sets.jpg', '00000000-0000-4000-a000-000000000003/volunteer-shirt.jpg']::text[], array['Smiling volunteers packing supplies at a school table', 'The back of a volunteer''s shirt reading: If you think my hands are full, you should see my heart']::text[], array['Nazareth College from Rochester, NY, USA, CC BY 2.0, via Wikimedia Commons', 'Nazareth College from Rochester, NY, USA, CC BY 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '15 days');

-- Native video posts: files in supabase/seed-images/post-videos (loaded by `supabase seed buckets`).
insert into posts (org_id, kind, body, video_path, video_poster_path, video_alt, video_credit, created_at) values
  ('00000000-0000-4000-a000-000000000001', 'update',
   'Saturday in the pantry garden: volunteers pulled the last of the summer squash and beans. About 140 pounds goes straight onto Tuesday''s pantry shelves.',
   '00000000-0000-4000-a000-000000000001/garden-harvest.webm', '00000000-0000-4000-a000-000000000001/garden-harvest.jpg',
   'Volunteers weeding and harvesting in a community garden', 'USDA, public domain, via Wikimedia Commons',
   now() - interval '3 days'),
  ('00000000-0000-4000-a000-000000000004', 'impact_story',
   'Public Lands Day: 64 volunteers re-cut two miles of eroded trail in a single morning. Next up, native seeding before the fall rains.',
   '00000000-0000-4000-a000-000000000004/trail-crew.webm', '00000000-0000-4000-a000-000000000004/trail-crew.jpg',
   'Volunteers with hand tools re-cutting a dirt trail across a dry hillside', 'BLM Oregon & Washington, public domain, via Wikimedia Commons',
   now() - interval '2 days 6 hours'),
  ('00000000-0000-4000-a000-000000000004', 'update',
   'Fence removal crew pulled 900 feet of old barbed wire this weekend, so deer and elk can move through the valley again.',
   '00000000-0000-4000-a000-000000000004/fence-removal.webm', '00000000-0000-4000-a000-000000000004/fence-removal.jpg',
   'A volunteer coiling old wire fencing in an open field while others work behind', 'BLM Oregon & Washington, public domain, via Wikimedia Commons',
   now() - interval '8 days');

-- The demo foundation posts about its grants to the demo nonprofits.
insert into posts (org_id, kind, body, image_paths, image_alts, image_credits, beneficiary_consent, created_at) values
  ('00000000-0000-4000-a000-000000000005', 'impact_story',
   'Fall Community Fund grants are out: $1.2M to 48 local nonprofits. Harbor Table (Demo) gets its new walk-in freezer, and Riverbend Readers (Demo) can train 30 more volunteer tutors. Thank you to the 2,100 neighbors who gave to the fund.',
   array['00000000-0000-4000-a000-000000000001/pantry-team.jpg']::text[], array['Volunteers in green shirts working together in a food pantry']::text[],
   array['USDAgov, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '1 day 12 hours'),
  ('00000000-0000-4000-a000-000000000005', 'update',
   'Spring grant applications open November 1. Small nonprofits without a grant writer: tell us, and we''ll pair you with a volunteer who has written one before.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '10 days');

