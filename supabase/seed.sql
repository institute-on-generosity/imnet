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
  ('00000000-0000-4000-a000-000000000001', 'impact_story', 'This summer our Eastside kitchen served its 10,000th meal. Maria, a retired line cook, now runs Tuesday service and teaches knife skills to new volunteers.',
   array['00000000-0000-4000-a000-000000000001/red-peppers.jpg']::text[], array['Fresh red peppers in a wooden crate']::text[], array['Shixart1985, CC BY 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '2 days'),
  ('00000000-0000-4000-a000-000000000001', 'update', 'This week''s grocery boxes went to 212 households: shelf-stable staples plus fresh produce from two local farms.',
   array['00000000-0000-4000-a000-000000000001/food-assistance-greens.jpg', '00000000-0000-4000-a000-000000000001/food-assistance-applesauce.jpg']::text[], array['Hands lifting cans of collard greens from a box of food-assistance groceries', 'Cans of applesauce packed in a cardboard case for distribution']::text[], array['USDAgov, public domain, via Wikimedia Commons', 'USDAgov, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000001', 'ask', 'Our walk-in freezer is failing. A new one keeps 800 meals a week safe. We are $3,400 away.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '9 days'),
  ('00000000-0000-4000-a000-000000000002', 'impact_story', 'The Okafor family got their keys on Friday. Three kids, three beds, one very happy dog. Our caseworker will check in weekly for the next six months.',
   array['00000000-0000-4000-a000-000000000002/keys-at-door.jpg']::text[], array['A hand holding house keys beside a door lock']::text[], array['Shixart1985, CC BY 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '1 days'),
  ('00000000-0000-4000-a000-000000000002', 'update', 'Moving day crews helped four families this month. Volunteers wrap, carry and set up, so families start their first night with beds made.',
   array['00000000-0000-4000-a000-000000000002/moving-box.jpg']::text[], array['A mover wrapping furniture for a family''s move']::text[], array['U.S. Army photo by Lisa Bishop, public domain, via Wikimedia Commons']::text[], true,
   now() - interval '12 days'),
  ('00000000-0000-4000-a000-000000000002', 'update', 'Quarterly numbers are in: 14 families moved from shelter to home this quarter, and every family from last year is still housed.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '20 days'),
  ('00000000-0000-4000-a000-000000000003', 'impact_story', 'In September, 42 second graders started with a tutor. Their teachers already see the difference: more hands up during read-aloud.',
   array['00000000-0000-4000-a000-000000000003/picture-book-shelf.jpg', '00000000-0000-4000-a000-000000000003/book-spines.jpg']::text[], array['A children''s library shelf of picture books', 'Colorful children''s book spines stacked together']::text[], array['Alequihdez, CC BY-SA 4.0, via Wikimedia Commons', 'Carol VanHook, CC BY-SA 2.0, via Wikimedia Commons']::text[], true,
   now() - interval '4 days'),
  ('00000000-0000-4000-a000-000000000003', 'update', 'Take-home book sets are packed for the fall: each student picks three books to keep.',
   '{}'::text[], '{}'::text[], '{}'::text[], false,
   now() - interval '15 days');
