#!/usr/bin/env python3
"""Generates supabase/seed_demo.sql: a lived-in demo network on top of seed.sql.

All organizations, people and numbers are fictional (the app shows a "Demo data" banner).
Photos are openly licensed (supabase/seed-images/CREDITS.md). Re-run after editing:

    python3 scripts/gen-seed-demo.py
"""
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import demo_more_orgs as more  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "supabase", "seed_demo.sql")
CREDITS = os.path.join(HERE, "..", "supabase", "seed-images", "credits.json")

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
    out.append(f"update orgs set logo_url = '{oid(n)}/logo.png' where id = '{oid(n)}';")
out.append("")

out.append("insert into orgs (id, slug, name, ein, website, mission, what_gifts_fund, status, org_type) values")
out.append(",\n".join(
    f"  ('{oid(n)}', '{slug}', {q(name)}, '00-00000{n:02d}', 'https://example.org/{slug}', {q(mission)}, {q(funds)}, 'verified', '{typ}')"
    for n, slug, name, typ, _, mission, funds in NEW_ORGS) + ";")
out.append("insert into org_causes (org_id, cause_slug) values")
out.append(",\n".join(f"  ('{oid(o[0])}', '{c}')" for o in NEW_ORGS for c in o[4]) + ";")
for o in NEW_ORGS:
    out.append(f"update orgs set logo_url = '{oid(o[0])}/logo.png' where id = '{oid(o[0])}';")
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

# --- Thirty more organizations (scripts/demo_more_orgs.py) and 280 more people -------------
# A separate random stream, so the data above stays identical when this part changes.
r2 = random.Random(20261015)
out.append("insert into orgs (id, slug, name, ein, website, mission, what_gifts_fund, status, org_type, logo_url) values")
out.append(",\n".join(
    f"  ('{oid(n)}', '{slug}', {q(name)}, '00-00000{n:02d}', 'https://example.org/{slug}', {q(mission)}, {q(funds)}, 'verified', '{typ}', '{oid(n)}/logo.png')"
    for n, slug, name, typ, _, mission, funds, *_ in more.ORGS) + ";")
out.append("insert into org_causes (org_id, cause_slug) values")
out.append(",\n".join(f"  ('{oid(o[0])}', '{c}')" for o in more.ORGS for c in o[4]) + ";")
out.append("insert into impact_stats (org_id, label, value, source_url, as_of, sort) values")
out.append(",\n".join(
    f"  ('{oid(o[0])}', {q(label)}, {q(value)}, 'https://example.org/{o[1]}/report-2026', '2026-09-01', {i})"
    for o in more.ORGS for i, (label, value) in enumerate(o[7])) + ";")
out.append("insert into posts (org_id, kind, body, created_at) values")
out.append(",\n".join(
    f"  ('{oid(o[0])}', '{kind}', {q(body)}, now() - interval '{days * 24:.0f} hours')"
    for o in more.ORGS for kind, body, days in o[8]) + ";")
out.append("insert into org_needs (org_id, kind, title, help_url, created_at) values")
out.append(",\n".join(
    f"  ('{oid(o[0])}', '{kind}', {q(title)}, {q(url if ':' in url else 'mailto:' + url)}, now() - interval '{r2.randint(1, 40)} days')"
    for o in more.ORGS for kind, title, url in o[9]) + ";")
for f, g, amount, purpose, days, report in more.GRANTS:
    out.append(f"insert into grants (foundation_id, grantee_id, amount_usd, purpose, awarded_on, confirmed_at) values "
               f"('{oid(f)}', '{oid(g)}', {amount}, {q(purpose)}, current_date - {days}, now() - interval '{days - 3} days');")
    if report:
        out.append(f"insert into posts (org_id, kind, body, reports_grant_id, created_at) select '{oid(g)}', 'impact_story', {q(report)}, id, "
                   f"now() - interval '{max(days - 20, 2)} days' from grants where foundation_id = '{oid(f)}' and grantee_id = '{oid(g)}' and purpose = {q(purpose)};")
for f, body, due, url, award, causes, days in more.OPEN_CALLS:
    out.append(f"insert into posts (org_id, kind, body, call_deadline, call_apply_url, call_max_award, call_causes, created_at) values "
               f"('{oid(f)}', 'open_call', {q(body)}, current_date + {due}, {q(url)}, {award}, '{{{','.join(causes)}}}', now() - interval '{days} days');")
out.append("")

MORE_IDS = [o[0] for o in more.ORGS]
EVERY_ORG = ALL_ORGS + MORE_IDS
BIOS2 = ["Nurse, runner, monthly donor.", "I give to the places I walk past every day.", "Board member at my kid's school. Literacy nerd.",
         "Retired engineer. I volunteer Tuesdays and fund trees.", "Grew up on free lunch. Paying it back.", "Small business owner. 1% of sales to local groups.",
         "Social worker. I see what these orgs do up close.", "Musician. Every kid deserves an instrument.", "New to the city, finding my people.",
         "Foster mom to too many kittens.", "Coach, carpool driver, occasional donor.", "Library card holder since 1979.",
         "Weekend creek cleaner.", "Learning to give with my kids: they pick one org each year.", "Doctor. Prevention is cheaper than cure.",
         "Former refugee. Now I sponsor families.", "Renters' rights matter.", "Chef. Food waste makes me crazy.", None, None, None, None]
FIRST2 = FIRST + ["Aaron", "Bea", "Cyrus", "Dalia", "Eli", "Farah", "Gus", "Hiro", "Ivy", "Jonah", "Kai", "Lena", "Milo", "Nia", "Oscar",
                  "Pia", "Quinn", "Rami", "Selma", "Theo", "Uma", "Vera", "Wes", "Xena", "Yara", "Zeke", "Anya", "Bruno", "Celia", "Dev"]
LAST2 = LAST + ["Abbott", "Banerjee", "Castillo", "Dubois", "Eze", "Fischer", "Goldberg", "Hale", "Iqbal", "Jensen", "Kaur", "Lindqvist",
                "Mwangi", "Novak", "Oyelaran", "Park", "Quintero", "Ramos", "Sato", "Torres", "Usman", "Vance", "Walsh", "Yilmaz", "Zhou"]
more_donors = []
for i in range(120, 400):
    first, last = r2.choice(FIRST2), r2.choice(LAST2)
    handle = f"{first}_{last}".lower()
    while handle in used:
        handle = f"{first}_{last}{r2.randint(2, 99)}".lower()
    used.add(handle)
    uid = f"00000000-0000-4000-c000-{i:012d}"
    more_donors.append(uid)
    bio = r2.choice(BIOS2)
    out.append(f"insert into auth.users (id, email, aud, role) values ('{uid}', '{handle}@example.com', 'authenticated', 'authenticated');")
    out.append(f"update profiles set handle = '{handle}', display_name = {q(first + ' ' + last)}, bio = {q(bio) if bio else 'null'}, "
               f"created_at = now() - interval '{r2.randint(5, 600)} days' where id = '{uid}';")
    mine = r2.sample(CAUSES, r2.randint(1, 3))
    for c in mine:
        out.append(f"insert into profile_causes (user_id, cause_slug) values ('{uid}', '{c}');")
    # People follow mostly within the causes they care about.
    pool = [o for o in more.ORGS if set(o[4]) & set(mine)]
    picks = {o[0] for o in r2.sample(pool, min(len(pool), r2.randint(2, 6)))} | set(r2.sample(EVERY_ORG, r2.randint(1, 4)))
    for o in picks:
        out.append(f"insert into follows (user_id, org_id, supporter) values ('{uid}', '{oid(o)}', {'true' if r2.random() < 0.3 else 'false'});")
# Earlier donors discover some of the new orgs too.
for uid in donors:
    for o in r2.sample(MORE_IDS, r2.randint(0, 4)):
        out.append(f"insert into follows (user_id, org_id, supporter) values ('{uid}', '{oid(o)}', {'true' if r2.random() < 0.25 else 'false'}) on conflict do nothing;")
everyone = donors + more_donors
for n in MORE_IDS:
    for uid in r2.sample(more_donors, 2 if n % 3 == 0 else 1):
        out.append(f"insert into org_members (org_id, user_id) values ('{oid(n)}', '{uid}') on conflict do nothing;")

# Thank-you notes and private gift logs from many people
NOTES = ["Thank you for showing up every week. It matters.", "I saw your volunteers in the rain on Saturday. Inspiring.",
         "You helped my neighbor when no one else would. Thank you.", "Keep posting these updates. I love seeing where my gift goes.",
         "My son still talks about your program. Thank you for being there.", "Proud to give to you every month.",
         "Your team made a hard week easier for our family.", "Thanks for treating everyone with so much dignity.",
         "We moved away but still follow every post. Miss you all.", "Small gift, big thanks. Keep going."]
for i in range(140):
    out.append(f"insert into thanks (org_id, user_id, body, created_at) values ('{oid(r2.choice(EVERY_ORG))}', '{r2.choice(everyone)}', "
               f"{q(r2.choice(NOTES))}, now() - interval '{r2.randint(1, 80)} days');")
for uid in r2.sample(everyone, 150):
    for _ in range(r2.randint(1, 6)):
        note = r2.choice(["Monthly", "Year-end gift", "In memory of Grandma", "Matched by my employer", None, None, None])
        out.append(f"insert into gifts (user_id, org_id, amount_usd, given_on, note) values ('{uid}', '{oid(r2.choice(EVERY_ORG))}', "
                   f"{r2.choice([10, 20, 25, 25, 50, 50, 100, 100, 250, 500, 1000])}, current_date - {r2.randint(1, 500)}, {q(note) if note else 'null'});")
out.append("")

# Current needs (F-051): concrete asks, a few recently met
NEEDS = [
    (1, "volunteer", "Saturday dinner crew", "Four-hour shifts, 3 to 7 pm. No experience needed.", "https://example.org/harbor-table/volunteer", None),
    (1, "item", "Large stockpots and sheet pans", "Gently used is fine. Drop off weekdays 9 to 5.", "mailto:kitchen@example.org", None),
    (1, "funding", "Walk-in cooler repair", None, "https://example.org/harbor-table/give", 6),
    (2, "volunteer", "Weekend roof crew", "Saturdays, 8 am. Tools and lunch provided.", "https://example.org/open-door/build", None),
    (2, "item", "Twin bed frames", None, "mailto:homes@example.org", None),
    (3, "item", "Picture books in Spanish and Vietnamese", "New or like new, ages 3 to 8.", "https://example.org/riverbend/books", None),
    (3, "volunteer", "Reading buddies, Tuesday afternoons", None, "https://example.org/riverbend/buddies", 12),
    (4, "volunteer", "Trail crew, first Saturday monthly", "Gloves and tools provided.", "https://example.org/greenway/crew", None),
    (7, "item", "Blankets and towels", "Clean, any size. Drop off at the front desk.", "mailto:shelter@example.org", None),
    (7, "volunteer", "Dog walkers, weekday mornings", None, "https://example.org/paws/walk", None),
    (8, "volunteer", "Planting day, Nov 7", "Bring water. We bring shovels and saplings.", "https://example.org/rooted/plant", None),
    (9, "item", "Exterior paint, any color", None, "mailto:studio@example.org", 4),
    (10, "item", "Cleats, kids sizes 1 to 6", None, "https://example.org/northside/gear", None),
    (11, "volunteer", "Airport welcome drivers", "Background check required.", "https://example.org/bridge/drive", None),
    (11, "item", "Kitchen starter kits", "Pots, pans, utensils for newly arrived families.", "mailto:welcome@example.org", None),
    (13, "item", "Chapter books for ages 8 to 12", None, "https://example.org/open-shelves/donate", None),
    (14, "funding", "Blood-pressure cuffs for 20 health workers", None, "https://example.org/health-corps/give", None),
]
out.append("insert into org_needs (org_id, kind, title, detail, help_url, met_at, created_at) values")
def met_sql(met):
    return f"now() - interval '{met} days'" if met else "null"
out.append(",\n".join(
    f"  ('{oid(o)}', '{k}', {q(t)}, {q(d) if d else 'null'}, {q(u)}, {met_sql(met)}, now() - interval '{(met or 0) + 10 + i} days')"
    for i, (o, k, t, d, u, met) in enumerate(NEEDS)) + ";")
out.append("")

# Thank-you notes (F-053): private, seen only by each org's staff
THANKS = [
    (1, "My dad ate at your Tuesday dinners last winter. He still talks about the soup. Thank you."),
    (1, "Volunteered once and saw how much care goes into every plate. Keep going."),
    (3, "My daughter's reading buddy changed how she feels about books."),
    (7, "We adopted Biscuit from you in June. He's asleep on my feet right now."),
    (11, "You met my cousin at the airport at 2 am. That meant everything to our family."),
]
for i, (o, body) in enumerate(THANKS):
    out.append(f"insert into thanks (org_id, user_id, body, created_at) values ('{oid(o)}', '{donors[i * 7]}', {q(body)}, now() - interval '{2 + i * 3} days');")
out.append("")

# Giving journal (F-052) for the demo donor: private
DANA = "00000000-0000-4000-b000-000000000001"
for o, amt, days, note in [(5, 500, 300, "Year-end gift"), (1, 100, 240, None), (1, 50, 120, "Holiday meals drive"), (5, 250, 60, None), (1, 25, 20, "Monthly")]:
    out.append(f"insert into gifts (user_id, org_id, amount_usd, given_on, note) values ('{DANA}', '{oid(o)}', {amt}, current_date - {days}, {q(note) if note else 'null'});")
out.append("")

# Demo event times are Pacific local time (the app shows each viewer's own zone).
# --- Events (F-058), volunteer interest (F-059) and 600 more people ------------------------
r3 = random.Random(20261016)
EVENTS = [
    (1, "Community dinner and kitchen tour", 4, 17, "Harbor Table kitchen, 12 Pier St", "Meet the cooks, see the walk-in freezer, stay for soup."),
    (1, "Holiday meal packing night", 38, 18, "Harbor Table kitchen, 12 Pier St", "We pack 600 holiday meal boxes. Ages 12 and up."),
    (2, "Build day: porch and ramp", 9, 8, "1420 Alder Ave", "Tools, lunch and safety training provided."),
    (3, "Tutor orientation", 22, 18, "Riverbend Branch Library, room B", None),
    (4, "Trail restoration day", 5, 9, "Greenway trailhead kiosk", "Gloves and tools provided. Wear boots."),
    (5, "Grantee showcase", 26, 17, "Lakeshore Community Center", "Ten grantees share a year of work. Open to all."),
    (7, "Adoption day", 3, 11, "Second Chance Paws shelter", None),
    (8, "Planting day on Delmar Street", 25, 9, "Delmar St and 5th Ave", "Bring water. We bring shovels and saplings."),
    (9, "Mural unveiling", 12, 16, "Westside underpass, 3rd St", "Our teens' new mural, with music and lemonade."),
    (10, "Spring registration and gear swap", 16, 10, "Northside Park field house", "Bring outgrown cleats; take what fits."),
    (11, "Welcome potluck", 7, 18, "Bridge Welcome Center", "Bring a dish from home, any home."),
    (12, "Volunteer info night", 10, 19, "Online", "Learn about peer support training."),
    (13, "Little library build day", 19, 10, "Open Shelves workshop, 88 Mill Rd", None),
    (14, "Free screening night", 2, 17, "Eastside Recreation Center", "Blood pressure and diabetes checks, interpreters on site."),
    (16, "Ride along: night rescue route", 6, 21, "Eastgate depot, 4 Dock Rd", None),
    (18, "Tutor training", 13, 18, "Pine Street school library", None),
    (19, "Creek cleanup", 11, 9, "Mill Creek at Birch Rd bridge", "Waders provided for the first 20 people."),
    (21, "Move-in kit assembly", 8, 18, "Hearth & Home Shelter, rear entrance", None),
    (22, "Bird release at the marsh", 15, 8, "Saltmarsh boardwalk parking lot", "Quiet please: watch three recovered herons fly home."),
    (23, "Student showcase", 20, 18, "Southside Music Lab", None),
    (24, "Pay-what-you-can dinner", 2, 18, "Shared Table kitchen", "This week: Eritrean lentils and injera."),
    (26, "Open house for families", 14, 10, "Little Oak Early Learning", None),
    (28, "Warehouse volunteer shift", 4, 9, "Prairie Wind warehouse, Route 6", "Closed-toe shoes required."),
    (29, "Opening night: fall show", 18, 19, "Old Mill Community Theater", "Pay what you can at the door."),
    (31, "Driver orientation", 9, 10, "Hilltop Senior Meals office", None),
    (32, "October river cleanup", 17, 9, "Canal Street boat launch", None),
    (33, "Harvest market day", 3, 8, "Saturday market, stall 14", None),
    (34, "Demo night", 24, 18, "Bright Lines lab, 2nd floor", "Teens present the apps they built this fall."),
    (36, "Foster orientation", 6, 19, "Online", "Everything you need to foster kittens."),
    (38, "Neighbor committee open meeting", 21, 18, "Bayside Library community room", None),
    (41, "Teen grants committee Q&A", 11, 17, "Online", "Ask our teen committee about youth-led grants."),
    (42, "Community health listening session", 30, 18, "Bellweather Health Trust offices", None),
]
out.append("insert into org_events (org_id, title, starts_at, location, detail) values")
out.append(",\n".join(
    f"  ('{oid(o)}', {q(t)}, (date_trunc('day', now() at time zone 'America/Los_Angeles') + interval '{d} days {h} hours') at time zone 'America/Los_Angeles', {q(loc)}, {q(det) if det else 'null'})"
    for o, t, d, h, loc, det in EVENTS) + ";")

BIOS3 = ["Mom of three. We volunteer as a family.", "Grad student. Small gifts, big hopes.", "Firefighter. I've seen what these groups do.",
         "Accountant by day, food bank sorter by night.", "Pastor. Our congregation gives locally.", "Barista who tips forward.",
         "Grandparent. I give in my grandkids' names.", "Software engineer, mentor, monthly donor.", "Librarian. Books for everyone.",
         "I give where I live.", "Bus driver. I know every neighborhood.", "College student organizing a campus giving circle.",
         "Veterinary tech and shelter volunteer.", "Retired teacher. Still tutoring.", "Union carpenter. Build days are my thing.",
         None, None, None, None, None]
FIRST3 = FIRST2 + ["Abel", "Bianca", "Cora", "Dmitri", "Esme", "Femi", "Gwen", "Henrik", "Isla", "Jamal", "Keiko", "Lior", "Mateo",
                   "Nell", "Otto", "Paloma", "Rhea", "Soren", "Tariq", "Una", "Vik", "Willa", "Yusuf", "Zoe", "Adaeze", "Bao", "Chidi"]
LAST3 = LAST2 + ["Acosta", "Bauer", "Chowdhury", "Delgado", "Ekstrom", "Ferreira", "Gill", "Holt", "Ito", "Jovanovic", "Kamau",
                 "Larsen", "Mahmoud", "Nakamura", "Osei", "Pham", "Rahman", "Sandoval", "Thapa", "Ueda", "Varga", "Wong"]
new_people = []
for i in range(400, 1000):
    first, last = r3.choice(FIRST3), r3.choice(LAST3)
    handle = f"{first}_{last}".lower()[:27]  # handles: a-z, 0-9, _; at most 30 chars
    while handle in used:
        handle = f"{first}_{last}".lower()[:27] + str(r3.randint(2, 99))
    used.add(handle)
    uid = f"00000000-0000-4000-c000-{i:012d}"
    new_people.append(uid)
    bio = r3.choice(BIOS3)
    out.append(f"insert into auth.users (id, email, aud, role) values ('{uid}', '{handle}@example.com', 'authenticated', 'authenticated');")
    out.append(f"update profiles set handle = '{handle}', display_name = {q(first + ' ' + last)}, bio = {q(bio) if bio else 'null'}, "
               f"created_at = now() - interval '{r3.randint(1, 700)} days' where id = '{uid}';")
    mine = r3.sample(CAUSES, r3.randint(1, 3))
    for c in mine:
        out.append(f"insert into profile_causes (user_id, cause_slug) values ('{uid}', '{c}');")
    pool = [o[0] for o in more.ORGS if set(o[4]) & set(mine)] + [n for n, *_ in NEW_ORGS if set(_[3]) & set(mine)]
    picks = set(r3.sample(pool, min(len(pool), r3.randint(1, 6)))) | set(r3.sample(EVERY_ORG, r3.randint(0, 3)))
    for o in picks:
        out.append(f"insert into follows (user_id, org_id, supporter) values ('{uid}', '{oid(o)}', {'true' if r3.random() < 0.3 else 'false'});")
people = everyone + new_people

# RSVPs: a handful to dozens per event; "I'm interested" on volunteer needs
for o, t, *_ in EVENTS:
    for uid in r3.sample(people, r3.randint(4, 45)):
        out.append(f"insert into event_rsvps (event_id, user_id) select id, '{uid}' from org_events where org_id = '{oid(o)}' and title = {q(t)};")
out.append(f"""insert into need_interest (need_id, user_id)
select n.id, p.id from org_needs n cross join lateral (
  select id from profiles where id::text like '00000000-0000-4000-c000-%' order by md5(n.id::text || id::text) limit 3 + (abs(hashtext(n.id::text)) % 22)
) p where n.kind = 'volunteer' and n.met_at is null on conflict do nothing;""")

# More notes and gift logs from the new people
for _ in range(160):
    out.append(f"insert into thanks (org_id, user_id, body, created_at) values ('{oid(r3.choice(EVERY_ORG))}', '{r3.choice(new_people)}', "
               f"{q(r3.choice(NOTES))}, now() - interval '{r3.randint(1, 80)} days');")
for uid in r3.sample(new_people, 220):
    for _ in range(r3.randint(1, 5)):
        out.append(f"insert into gifts (user_id, org_id, amount_usd, given_on) values ('{uid}', '{oid(r3.choice(EVERY_ORG))}', "
                   f"{r3.choice([5, 10, 20, 25, 50, 50, 75, 100, 150, 250, 500])}, current_date - {r3.randint(1, 500)});")
out.append("")

# --- Comments (F-062): many people comment on nonprofit and foundation posts; teams reply -------------
GENERAL = [
    "This is why I give. Thank you, {org}.", "Love seeing the actual numbers. Keep posting these.", "Shared this with my book club.",
    "What a week. Thank you to every volunteer.", "This made my morning.", "Proud to be a monthly donor.",
    "My neighbor volunteers with you and never stops talking about it.", "Thank you for telling this with so much respect.",
    "How can someone new get involved?", "Sending this to my company's giving committee.", "Incredible progress since spring.",
    "I walked past last Saturday and the energy was amazing.", "Small gift coming your way this month.",
    "Thank you for being so transparent about where the money goes.", "The volunteers in this photo deserve all the credit.",
    "We need more of this in our city.", "Keep going. People notice.", "Is there a way to sponsor this directly?",
    "My kids and I picked {org} for our family gift this year. This is why.", "Amazing team. Amazing work.",
    "Love that you share the hard parts too.", "This is what community looks like.", "Thank you for showing up, every single week.",
    "Just signed up to volunteer. See you soon!", "Congrats to the whole crew.", "Reading this on the bus and smiling.",
    "Our church collected for you last month. So glad to see the results.", "Wow. That's a lot of people helped.",
    "You all make this city better.", "Following for more updates like this.", "Do you take in-kind donations?",
    "The best kind of news.", "I was helped by a group like this years ago. Thank you for doing it now.",
    "Can't wait to see what's next.", "Grateful you exist.", "Shared with my neighborhood group.",
]
FOUNDATION = [
    "Thank you for funding local groups that actually do the work.", "Love that you publish every grant here.",
    "Multi-year support is such a big deal for small nonprofits. Thank you.", "Great to see {org} backing grassroots groups.",
    "I give through this fund. Seeing the grantee reports makes it real.", "Any plans to fund more youth programs next cycle?",
    "Transparent grantmaking. More of this, please.", "So glad the grantees confirm each grant publicly.",
    "How do small groups without a development team apply?", "This is the kind of philanthropy I want to support.",
]
ASK = ["Signed up!", "Dropping some off this weekend.", "Shared with my building's group chat.", "Just sent a little.",
       "My office is doing a drive for this next week.", "Count me in for Saturday.", "Is there a wish list somewhere?"]
REPLIES = [
    "Thank you so much. This means a lot to our whole team.", "Thank you for being here with us.",
    "We'd love to have you! Details are on our profile under Current needs.", "Thank you! We'll keep sharing updates.",
    "Our volunteers will be so happy to read this.", "Thank you. Every gift really does add up.",
    "Yes! Send us a note through the Help link and we'll get you started.", "Grateful for you. See you soon.",
]
PEER = ["Couldn't agree more.", "Same here!", "See you there!", "This is exactly why I started volunteering too.",
        "Well said.", "Thanks for sharing that.", "I'm going Saturday too. Say hi!", "Love this.", "So true.",
        "My family feels the same way.", "Their volunteer orientation is great, highly recommend.", "Yes! Signed up after reading this."]
def sql_arr(xs):
    return "array[" + ", ".join(q(x) for x in xs) + "]"
out.append(f"""-- Comments: 2 to 29 people per post, spread between the post time and now.
insert into comments (post_id, user_id, body, created_at)
select p.id, d.id,
       replace((case when o.org_type = 'foundation' then {sql_arr(FOUNDATION + GENERAL)}
                     when p.kind = 'ask' then {sql_arr(ASK + GENERAL)}
                     else {sql_arr(GENERAL)} end)[1 + (abs(hashtext(p.id::text || 'body')) + d.rn) %
               (case when o.org_type = 'foundation' then {len(FOUNDATION) + len(GENERAL)} when p.kind = 'ask' then {len(ASK) + len(GENERAL)} else {len(GENERAL)} end)], '{{org}}', o.name),
       p.created_at + (now() - p.created_at) * ((abs(hashtext(p.id::text || d.id::text)) % 950) / 1000.0)
  from posts p join orgs o on o.id = p.org_id
  cross join lateral (
    select id, row_number() over (order by md5(p.id::text || id::text || 'comment')) rn from profiles
     where id::text like '00000000-0000-4000-c000-%'
     order by md5(p.id::text || id::text || 'comment') limit 2 + abs(hashtext(p.id::text || 'comments')) % 28
  ) d
 where p.published;

-- Team replies (LinkedIn "Author" replies) under one or two comments on about half the posts.
insert into comments (post_id, parent_id, user_id, body, as_org, created_at)
select c.post_id, c.id, m.user_id, ({sql_arr(REPLIES)})[1 + abs(hashtext(c.id::text || 'reply')) % {len(REPLIES)}], true,
       least(now() - interval '5 minutes', c.created_at + interval '2 hours')
  from (select c.*, row_number() over (partition by post_id order by md5(id::text)) rn from comments c) c
  join posts p on p.id = c.post_id
  cross join lateral (select user_id from org_members where org_id = p.org_id order by created_at, user_id limit 1) m
 where c.rn <= 1 + abs(hashtext(p.id::text)) % 2 and abs(hashtext(p.id::text || 'reply')) % 10 < 5;

-- People reply to each other under about one comment in six.
insert into comments (post_id, parent_id, user_id, body, created_at)
select c.post_id, c.id, r.id, ({sql_arr(PEER)})[1 + abs(hashtext(c.id::text || r.id::text)) % {len(PEER)}],
       least(now() - interval '2 minutes', c.created_at + make_interval(mins => 10 + abs(hashtext(c.id::text || 'peer')) % 600))
  from comments c
  cross join lateral (
    select id from profiles where id::text like '00000000-0000-4000-c000-%' and id <> c.user_id
     order by md5(c.id::text || id::text) limit 1 + abs(hashtext(c.id::text || 'n')) % 2
  ) r
 where c.parent_id is null and not c.as_org and abs(hashtext(c.id::text || 'peer')) % 6 = 0;
""")


# --- Donor badges (F-065): many commenters gave to the org they comment on; most opt in --------------
out.append("""-- About 4 in 10 commenters logged a gift to that org before commenting.
insert into gifts (user_id, org_id, amount_usd, given_on, note)
select distinct on (c.user_id, p.org_id) c.user_id, p.org_id,
       (array[10, 20, 25, 50, 50, 100, 100, 250, 500])[1 + abs(hashtext(c.user_id::text || p.org_id::text)) % 9],
       (c.created_at - make_interval(days => 3 + abs(hashtext(c.id::text || 'gift')) % 200))::date, null
  from comments c join posts p on p.id = c.post_id
 where not c.as_org and c.user_id::text like '00000000-0000-4000-c000-%' and abs(hashtext(c.user_id::text || p.org_id::text || 'gave')) % 10 < 4;
-- Two in three demo people show the Donor badge.
update profiles set donor_badge = true where id::text like '00000000-0000-4000-c000-%' and abs(hashtext(id::text || 'badge')) % 3 < 2;
""")

# Private reactions and saves, and 30 days of analytics
out.append(f"""-- "Moved" and saves: random donors on random posts (private; only totals show to staff).
insert into moved (user_id, post_id)
select d.id, p.id from posts p cross join lateral (
  select id from profiles where id::text like '00000000-0000-4000-c000-%' order by md5(id::text || p.id::text) limit (abs(hashtext(p.id::text)) % 160)
) d on conflict do nothing;
insert into saved_posts (user_id, post_id)
select d.id, p.id from posts p cross join lateral (
  select id from profiles where id::text like '00000000-0000-4000-c000-%' order by md5(p.id::text || id::text) limit (abs(hashtext(p.id::text || 's')) % 30)
) d on conflict do nothing;

-- Views, shares and donate clicks over the last 30 days.
insert into events (type, org_id, post_id, created_at)
select (array['view','view','view','view','view','view','share','donate_click'])[1 + (abs(hashtext(p.id::text || g::text)) % 8)],
       p.org_id, p.id, now() - make_interval(hours => abs(hashtext(g::text || p.id::text)) % 720)
  from posts p cross join generate_series(1, 20 + abs(hashtext(p.id::text)) % 120) g;
""")

open(OUT, "w").write("\n".join(out) + "\n")
print(f"wrote {os.path.relpath(OUT)}: {len(NEW_ORGS) + len(more.ORGS)} new orgs, {len(POSTS) + sum(len(o[8]) for o in more.ORGS)} posts, "
      f"{len(GRANTS) + len(more.GRANTS)} grants, {len(people)} people, {len(EVENTS)} events")
