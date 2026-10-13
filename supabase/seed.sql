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
   'verified')
on conflict do nothing;

insert into org_causes (org_id, cause_slug) values
  ('00000000-0000-4000-a000-000000000001', 'hunger'),
  ('00000000-0000-4000-a000-000000000002', 'housing'),
  ('00000000-0000-4000-a000-000000000002', 'youth'),
  ('00000000-0000-4000-a000-000000000003', 'education'),
  ('00000000-0000-4000-a000-000000000003', 'youth')
on conflict do nothing;

insert into impact_stats (org_id, label, value, source_url, as_of, sort) values
  ('00000000-0000-4000-a000-000000000001', 'Meals served', '48,200', 'https://example.org/harbor-table/annual-report', '2026-06-30', 0),
  ('00000000-0000-4000-a000-000000000001', 'Volunteer hours', '9,100', 'https://example.org/harbor-table/annual-report', '2026-06-30', 1),
  ('00000000-0000-4000-a000-000000000002', 'Families housed', '62', 'https://example.org/open-door/outcomes', '2026-06-30', 0),
  ('00000000-0000-4000-a000-000000000002', 'Still housed after 1 year', '91%', 'https://example.org/open-door/outcomes', '2026-06-30', 1),
  ('00000000-0000-4000-a000-000000000003', 'Students tutored', '310', 'https://example.org/riverbend/report', '2026-06-01', 0),
  ('00000000-0000-4000-a000-000000000003', 'Reading at grade level (from 38%)', '71%', 'https://example.org/riverbend/report', '2026-06-01', 1);

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

-- A shared video (credited; not presented as Harbor Table's own footage).
insert into posts (org_id, kind, body, embed_url, embed_credit, created_at) values
  ('00000000-0000-4000-a000-000000000001', 'update',
   'How a big-city food bank moves food from dock to table. Our new volunteers watched this before Saturday''s training. Worth 90 seconds.',
   'https://commons.wikimedia.org/wiki/File%3ASan_Antonio%2C_TX%2C_Food_Bank_(20111031-FNS-LSC-9001).webm?embedplayer=yes',
   'U.S. Department of Agriculture, public domain, via Wikimedia Commons',
   now() - interval '3 days');
