#!/usr/bin/env python3
"""Generates supabase/seed_demo.sql: a lived-in demo network on top of seed.sql.

All organizations, people and numbers are fictional (the app shows a "Demo data" banner).
Photos are openly licensed (supabase/seed-images/CREDITS.md). Re-run after editing:

    python3 scripts/gen-seed-demo.py
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "supabase", "seed_demo.sql")
CREDITS = os.path.join(HERE, "..", "supabase", "seed-images", "credits.json")
STORAGE = "http://127.0.0.1:54321/storage/v1/object/public/post-images"  # local Supabase (also CI)

random.seed(20261013)


def oid(n: int) -> str:
    return f"00000000-0000-4000-a000-0000000000{n:02d}"


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def arr(xs) -> str:
    return "array[" + ", ".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"


credits = {c["path"]: c for c in json.load(open(CREDITS))}

# --- New organizations -------------------------------------------------------------------
NEW_ORGS = [
    (7, "second-chance-paws", "Second Chance Paws", "nonprofit", ["animals"],
     "A volunteer-run shelter giving overlooked dogs and cats time, training and a second chance at a home.",
     "$35 vaccinates a new arrival. $150 covers a month of care for a senior dog."),
    (8, "rooted-neighborhoods", "Rooted Neighborhoods", "nonprofit", ["environment"],
     "Planting and caring for street trees on the blocks with the least shade, with the neighbors who live there.",
     "$60 plants one street tree with a stake, mulch and two years of watering."),
    (9, "westside-arts-studio", "Westside Arts Studio", "nonprofit", ["arts", "youth"],
     "Free art classes and public murals made with teens from the west side.",
     "$25 stocks a student's sketchbook kit for a semester. $1,200 funds a mural wall."),
    (10, "northside-youth-soccer", "Northside Youth Soccer", "nonprofit", ["youth"],
     "No-fee soccer for kids 6 to 14, with volunteer coaches and a ride home when needed.",
     "$45 covers a player's cleats and shin guards. $400 covers a season of field rental."),
    (11, "bridge-welcome-center", "Bridge Welcome Center", "nonprofit", ["refugees"],
     "Helping newly arrived families settle in: English classes, school enrollment, first apartments and jobs.",
     "$80 buys a welcome kit for a family's first week. $300 covers a month of English classes for one adult."),
    (12, "clear-minds-collective", "Clear Minds Collective", "nonprofit", ["mental-health"],
     "Free peer support groups and a warm line staffed by trained volunteers who have been there.",
     "$20 trains a volunteer for one hour. $500 keeps the warm line open for a week of evenings."),
    (13, "open-shelves", "Open Shelves", "nonprofit", ["education"],
     "Little libraries in laundromats, clinics and bus shelters, restocked every week by volunteers.",
     "$15 fills a shelf with ten books. $250 builds and installs a new little library."),
    (14, "neighborhood-health-corps", "Neighborhood Health Corps", "nonprofit", ["health"],
     "Volunteer nurses and community health workers running free screening nights and helping people find a doctor.",
     "$40 covers supplies for one screening night station. $2,000 funds a month of follow-up calls."),
    (15, "meridian-health-foundation", "Meridian Health Foundation", "foundation", ["health", "mental-health"],
     "A private foundation funding community health and mental health care close to home.",
     "Grants to local clinics and peer programs, most between $10,000 and $50,000."),
]
STATS = {
    7: [("Animals adopted", "418"), ("Volunteer walkers", "96")],
    8: [("Trees planted", "1,240"), ("Two-year survival rate", "88%")],
    9: [("Students in free classes", "210"), ("Murals painted", "14")],
    10: [("Players this season", "180"), ("Volunteer coaches", "32")],
    11: [("Families welcomed", "156"), ("Adults in English classes", "74")],
    12: [("Warm line calls answered", "3,900"), ("Peer groups each week", "9")],
    13: [("Little libraries", "41"), ("Books given away", "22,500")],
    14: [("People screened", "2,310"), ("Connected to a doctor", "640")],
    15: [("Granted in 2026", "$2.4M"), ("Community partners", "37")],
}

# --- Posts (body, kind, days ago, photos) -------------------------------------------------
POSTS = [
    (7, "impact_story", "Biscuit spent 214 days with us. On Sunday she went home with a retired teacher who reads to her on the porch. Thank you to every walker who never skipped her.", 3.2, ["volunteer-golden.jpg"]),
    (7, "update", "Saturday adoption day: 11 dogs and 6 cats found homes. Our volunteers logged 140 walking hours this month.", 9, ["volunteer-two-dogs.jpg"]),
    (7, "ask", "We need 20 more weekday dog walkers, especially mornings. One hour a week makes a real difference for a shelter dog.", 17, []),
    (7, "update", "New kennel heaters are in before the first cold night. Thank you, neighbors, for the donation drive.", 33, []),
    (8, "impact_story", "Delmar Street has shade for the first time in decades: 46 new trees, planted by 60 neighbors in one morning.", 2.6, ["planting-saplings.jpg"]),
    (8, "update", "Watering crews are out every Tuesday and Thursday through October. Young trees need about 15 gallons a week.", 12, ["carrying-trees.jpg"]),
    (8, "update", "Our two-year survival rate is 88%, up from 71%. The difference: neighbors who adopt a tree and water it.", 26, ["planting-hillside.jpg"]),
    (8, "ask", "Know a block that bakes in summer? Nominate it for spring planting. Residents choose the species.", 41, []),
    (9, "update", "Mural walk: our teens studied this tunnel mural before sketching their own wall for the underpass. Next step: a community vote on designs.", 4.5, ["tunnel-mural.jpg"]),
    (9, "update", "Guest artist week: muralist Lena Ortiz showed students how to scale a sketch to a 30-foot wall.", 15, ["wall-painting.jpg"]),
    (9, "update", "Fall classes are full, with 84 students. We added a Thursday evening session for the waitlist.", 29, []),
    (9, "ask", "We are out of acrylics and brushes. A $25 kit keeps one student painting all semester.", 52, []),
    (10, "impact_story", "Our U12 team finished the season undefeated, but the real win: every player showed up to every practice, thanks to the volunteer carpool.", 5.5, []),
    (10, "update", "Registration for spring is open and free. We have room for 60 more players.", 13, []),
    (10, "update", "32 volunteer coaches finished first-aid and concussion training this weekend.", 34, []),
    (10, "ask", "Our cleats closet is empty in sizes 3 to 6. Gently used donations welcome at Saturday practice.", 58, []),
    (11, "impact_story", "Amina started English class in March. Last week she led her son's parent-teacher conference without an interpreter.", 3.8, []),
    (11, "update", "Twelve families arrived this month. Volunteers set up nine apartments with beds, dishes and a full fridge before move-in.", 11, []),
    (11, "update", "Our job readiness group helped 18 adults land first jobs this quarter, most in health care and logistics.", 27, []),
    (11, "ask", "We need volunteer drivers for school enrollment week. Two hours, any morning, a huge help.", 45, []),
    (12, "impact_story", "Our warm line answered its 3,900th call this year. Most callers just need someone who listens, and has been there.", 6.2, []),
    (12, "update", "New peer group on Wednesdays for new parents. Facilitated by two volunteer moms, free and confidential.", 16, []),
    (12, "update", "Twenty-two new volunteers finished the 40-hour peer support training. They start on the warm line next week.", 38, []),
    (13, "impact_story", "The little library at the Main Street laundromat empties every week. This week a regular left a note: \"My daughter reads while we wait now.\"", 4.9, []),
    (13, "update", "Three new little libraries installed this month: two clinics and the Route 9 bus shelter.", 14, []),
    (13, "ask", "Children's picture books are our most requested and the first to go. Book drive at the library through Friday.", 31, []),
    (14, "impact_story", "At last Thursday's screening night, 112 neighbors had blood pressure checks. 19 were connected to a doctor the same week.", 2.9, []),
    (14, "update", "Our follow-up call team reached 640 people this year who had no regular doctor. Most now do.", 19, []),
    (14, "update", "Sixteen new community health workers finished training this week: blood pressure, diabetes screening and how to help someone find a doctor.", 9.5, ["health-workers-class.jpg", "health-trainer.jpg"]),
    (14, "update", "Screening nights are now monthly at the Eastside recreation center, with Spanish and Somali interpreters.", 44, []),
    (15, "update", "We're funding peer-led mental health programs this year, because people often reach out first to someone who has been there.", 8, []),
    (1, "update", "The pantry garden is done for the season: 640 pounds of produce this year, all of it on Tuesday shelves within a day of picking.", 21, ["garden-hands.jpg"]),
    (2, "impact_story", "One year ago the Reyes family moved out of the shelter. This month they renewed their lease, and their son made the honor roll.", 7, []),
    (2, "ask", "Moving day crews need two more pickup trucks on Saturday mornings. Gas cards provided.", 23, []),
    (3, "update", "Tutor orientation is full for October. Next session: November 4. Bring a favorite children's book.", 10, []),
    (3, "impact_story", "Jamal read his first chapter book to his tutor, out loud, all the way through. He asked to keep it.", 36, []),
    (4, "update", "Native seed collection day: 30 volunteers gathered seed from 14 species for next spring's planting.", 20, []),
    (4, "ask", "We're short on work gloves in small sizes. Donations at the trailhead kiosk any weekend.", 48, []),
    (5, "update", "Our grants committee read 96 applications this cycle. Every applicant gets written feedback, funded or not.", 18, []),
    (6, "update", "Rapid-response grants are open year round for food programs in the river valley. Most decisions in under three weeks.", 25, []),
]

# --- Video posts (org, kind, body, days ago, file stem, alt, credit) --------------------
VIDEO_POSTS = [
    (1, "update", "Saturday's farm delivery: 1,000 pounds of potatoes, unloaded in twenty minutes and on Tuesday's shelves.", 5.1,
     "truck-delivery", "A worker unloading sacks of potatoes from a delivery truck", "USDA, public domain, via Wikimedia Commons"),
    (8, "update", "Bed prep for spring planting: every new tree pit gets loosened soil and compost before it gets a tree.", 8.4,
     "bed-prep", "A volunteer working soil in a garden bed", "USDA, public domain, via Wikimedia Commons"),
    (9, "update", "Mural walk, part two: community murals that tell a neighborhood's story. Our teens picked their favorite details for the underpass design.", 11.3,
     "mural-pan", "A long, colorful community mural along a street", "Luis Alvaz, CC BY-SA 4.0, via Wikimedia Commons"),
]

# --- Grants (foundation, grantee, amount, purpose, days ago, report) ---------------------
GRANTS = [
    (15, 14, 40000, "Monthly screening nights", 30,
     "With Meridian Health Foundation's grant, screening nights went monthly. 112 neighbors were screened last week; 19 now have a doctor."),
    (15, 12, 15000, "Training new peer volunteers", 50,
     "Meridian's grant trained 22 new peer volunteers. The warm line now covers every weekday evening."),
    (5, 7, 6000, "Kennel heaters", 40, "The new kennel heaters from Lakeshore's grant kept every dog warm through the first frost."),
    (5, 11, 20000, "English classes for adults", 60, None),
    (6, 13, 8000, "Little libraries in clinics", 35, None),
]

FIRST = ["Maya", "Jordan", "Priya", "Luis", "Grace", "Omar", "Hannah", "Diego", "Aisha", "Ben", "Sofia", "Kenji", "Leah", "Marcus",
         "Elena", "Sam", "Nadia", "Tom", "Rosa", "Ibrahim", "Chloe", "Andre", "Mei", "Patrick", "Zara", "Victor", "Lucy", "Hassan",
         "Ruth", "Carlos", "Amara", "Daniel", "Ines", "Kwame", "Julia", "Ravi", "Noor", "Peter", "Yuki", "Fatima"]
LAST = ["Nguyen", "Okafor", "Patel", "Garcia", "Kim", "Haddad", "Schmidt", "Rossi", "Mensah", "Cohen", "Silva", "Tanaka", "Murphy",
        "Ali", "Kowalski", "Brooks", "Reyes", "Chen", "Johansson", "Diallo", "Moreau", "Hughes", "Petrov", "Ortiz", "Ahmed", "Wright"]
BIOS = ["Monthly giver. Food security and good libraries.", "Volunteer on weekends, donor on weekdays.", "Teacher. I give where kids are.",
        "Learning where my giving goes.", "Dog walker at the shelter every Sunday.", "Retired nurse. Health access for everyone.",
        "Tree planter. Shade is infrastructure.", "First-generation immigrant paying it forward.", None, None, None]
CAUSES = ["hunger", "housing", "education", "health", "environment", "youth", "animals", "arts", "refugees", "mental-health"]
ALL_ORGS = list(range(1, 16))

out = ["-- GENERATED by scripts/gen-seed-demo.py. Fictional demo network on top of seed.sql. Do not edit by hand.", ""]

# Logos for the base orgs from seed.sql (generated marks; new orgs get theirs below)
for n in range(1, 7):
    out.append(f"update orgs set logo_url = '{STORAGE}/{oid(n)}/logo.png' where id = '{oid(n)}';")
out.append("")

out.append("insert into orgs (id, slug, name, ein, website, mission, what_gifts_fund, status, org_type) values")
out.append(",\n".join(
    f"  ('{oid(n)}', '{slug}', {q(name)}, '00-00000{n:02d}', 'https://example.org/{slug}', {q(mission)}, {q(funds)}, 'verified', '{typ}')"
    for n, slug, name, typ, _, mission, funds in NEW_ORGS) + ";")
out.append("insert into org_causes (org_id, cause_slug) values")
out.append(",\n".join(f"  ('{oid(o[0])}', '{c}')" for o in NEW_ORGS for c in o[4]) + ";")
for o in NEW_ORGS:
    out.append(f"update orgs set logo_url = '{STORAGE}/{oid(o[0])}/logo.png' where id = '{oid(o[0])}';")
out.append("insert into impact_stats (org_id, label, value, source_url, as_of, sort) values")
out.append(",\n".join(
    f"  ('{oid(n)}', {q(label)}, {q(value)}, 'https://example.org/{NEW_ORGS[n - 7][1]}/report-2026', '2026-09-01', {i})"
    for n, stats in STATS.items() for i, (label, value) in enumerate(stats)) + ";")
out.append("")

# Posts
rows = []
for n, kind, body, days, photos in POSTS:
    paths = [f"{oid(n)}/{p}" for p in photos]
    alts = [credits[p]["alt"] for p in paths]
    creds = [credits[p]["credit"] for p in paths]
    rows.append(f"  ('{oid(n)}', '{kind}', {q(body)}, {arr(paths)}, {arr(alts)}, {arr(creds)}, {'true' if photos else 'false'}, now() - interval '{days * 24:.0f} hours')")
out.append("insert into posts (org_id, kind, body, image_paths, image_alts, image_credits, beneficiary_consent, created_at) values")
out.append(",\n".join(rows) + ";")
out.append("")

# Native video posts (files in supabase/seed-images/post-videos/<org>/)
out.append("insert into posts (org_id, kind, body, video_path, video_poster_path, video_alt, video_credit, created_at) values")
out.append(",\n".join(
    f"  ('{oid(n)}', '{kind}', {q(body)}, '{oid(n)}/{stem}.webm', '{oid(n)}/{stem}.jpg', {q(alt)}, {q(credit)}, now() - interval '{days * 24:.0f} hours')"
    for n, kind, body, days, stem, alt, credit in VIDEO_POSTS) + ";")
out.append("")

# Open call from the new foundation
out.append("""insert into posts (org_id, kind, body, call_deadline, call_apply_url, call_max_award, call_causes, created_at) values
  ('{}', 'open_call', 'Community mental health grants: up to $30,000 for peer-led programs and warm lines. Small organizations welcome; a one-page letter of intent to start.',
   current_date + 21, 'https://example.org/meridian/apply', 30000, '{{health,mental-health}}', now() - interval '6 days');""".format(oid(15)))
out.append("")

# Grants (+ reports)
for f, g, amount, purpose, days, report in GRANTS:
    out.append(f"insert into grants (foundation_id, grantee_id, amount_usd, purpose, awarded_on, confirmed_at) values "
               f"('{oid(f)}', '{oid(g)}', {amount}, {q(purpose)}, current_date - {days}, now() - interval '{days - 3} days');")
    if report:
        out.append(f"insert into posts (org_id, kind, body, reports_grant_id, created_at) select '{oid(g)}', 'impact_story', {q(report)}, id, "
                   f"now() - interval '{max(days - 20, 5)} days' from grants where foundation_id = '{oid(f)}' and grantee_id = '{oid(g)}';")
out.append("")

# Donors
donors = []
used = set()
for i in range(120):
    first, last = random.choice(FIRST), random.choice(LAST)
    handle = f"{first}_{last}".lower()
    while handle in used:
        handle = f"{first}_{last}{random.randint(2, 99)}".lower()
    used.add(handle)
    uid = f"00000000-0000-4000-c000-{i:012d}"
    donors.append(uid)
    bio = random.choice(BIOS)
    out.append(f"insert into auth.users (id, email, aud, role) values ('{uid}', '{handle}@example.com', 'authenticated', 'authenticated');")
    out.append(f"update profiles set handle = '{handle}', display_name = {q(first + ' ' + last)}, bio = {q(bio) if bio else 'null'} where id = '{uid}';")
    for c in random.sample(CAUSES, random.randint(1, 3)):
        out.append(f"insert into profile_causes (user_id, cause_slug) values ('{uid}', '{c}');")
    # Bigger, older orgs get more followers.
    weights = [9, 6, 6, 4, 7, 4, 5, 3, 3, 3, 3, 3, 2, 3, 2]
    follows = set(random.choices(ALL_ORGS, weights=weights, k=random.randint(2, 7)))
    for o in follows:
        supporter = "true" if random.random() < 0.25 else "false"
        out.append(f"insert into follows (user_id, org_id, supporter) values ('{uid}', '{oid(o)}', {supporter});")
out.append("")

# Team members: a second (sometimes third) staff member at each org
for n in ALL_ORGS:
    for uid in random.sample(donors, 2 if n % 3 == 0 else 1):
        out.append(f"insert into org_members (org_id, user_id) values ('{oid(n)}', '{uid}') on conflict do nothing;")
out.append("")

# Private reactions and saves, and 30 days of analytics
out.append(f"""-- "Moved" and saves: random donors on random posts (private; only totals show to staff).
insert into moved (user_id, post_id)
select d.id, p.id from posts p cross join lateral (
  select id from profiles where id::text like '00000000-0000-4000-c000-%' order by md5(id::text || p.id::text) limit (abs(hashtext(p.id::text)) % 28)
) d on conflict do nothing;
insert into saved_posts (user_id, post_id)
select d.id, p.id from posts p cross join lateral (
  select id from profiles where id::text like '00000000-0000-4000-c000-%' order by md5(p.id::text || id::text) limit (abs(hashtext(p.id::text || 's')) % 6)
) d on conflict do nothing;

-- Views, shares and donate clicks over the last 30 days.
insert into events (type, org_id, post_id, created_at)
select (array['view','view','view','view','view','view','share','donate_click'])[1 + (abs(hashtext(p.id::text || g::text)) % 8)],
       p.org_id, p.id, now() - make_interval(hours => abs(hashtext(g::text || p.id::text)) % 720)
  from posts p cross join generate_series(1, 6 + abs(hashtext(p.id::text)) % 40) g;
""")

open(OUT, "w").write("\n".join(out) + "\n")
print(f"wrote {os.path.relpath(OUT)}: {len(NEW_ORGS)} orgs, {len(POSTS)} posts, {len(GRANTS)} grants, {len(donors)} donors")
