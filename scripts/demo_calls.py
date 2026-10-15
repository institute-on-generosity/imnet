"""Calls for volunteers and donations (F-084), imported by gen-seed-demo.py. All fictional orgs.

(org, kind, body, days ago, action in N days (date) or None, goal or None, [photos in post-images/<org>/], video stem in post-videos/<org>/ or None)
Media are the org's own openly licensed files (credited in CREDITS.md).
"""

V, D = "call_volunteers", "call_donations"
CALLS = [
    (1, V, "We need 12 more people for Saturday dinner crew this month. Four-hour shifts, 3 to 7 pm. You'll prep, serve and sit down to eat with our guests. No experience needed, aprons provided.", 0.3, 4, None, ["pantry-team.jpg", "packing-boxes.jpg"], None),
    (1, D, "Our walk-in cooler is 19 years old and losing the fight. A new compressor keeps 1,100 pounds of fresh produce a week safe. Every dollar goes to the repair.", 1.4, 21, 8500, ["pantry-restock.jpg"], None),
    (4, V, "Trail crew day on the river corridor: we're re-benching the section that washed out in spring. Tools, gloves and lunch provided. Bring boots and water.", 0.9, 9, None, [], "trail-crew"),
    (4, D, "Help us replace 40 worn-out hand tools before spring season. $35 buys a pulaski or a McLeod that will last a decade of volunteers.", 6.2, 30, 3200, ["deer-hill-trail-national-public-af6875.webp", "deer-hill-trail-national-public-c67534.webp"], None),
    (7, V, "Long-stay dogs need weekday morning walkers. One hour a week keeps them calm, healthy and adoptable. Orientation is 20 minutes and you'll be walking the same day.", 0.6, 6, None, ["volunteer-golden.jpg", "volunteer-two-dogs.jpg"], None),
    (8, V, "Planting day on Delmar Street: 120 trees, 3 hours. Neighbors chose red maple and swamp white oak. We bring shovels, saplings and coffee.", 1.1, 24, None, ["planting-saplings.jpg", "carrying-trees.jpg", "planting-hillside.jpg"], None),
    (8, D, "Each street tree costs $60 with a stake, mulch and two summers of watering. Help us plant the next 200 on the hottest blocks in the city.", 4.5, 45, 12000, [], "bed-prep"),
    (9, D, "Our teens are out of acrylics and brushes. $25 keeps one student painting all semester. Help us stock the studio for 84 students.", 2.4, 28, 2100, ["artist-ron-blackburn-painting-an-76e6ef.webp", "wall-painting.jpg"], None),
    (9, V, "Mural day on the 3rd Street underpass: we need adults to help prime walls and run the paint table. Teens lead the design.", 7.8, 12, None, [], "mural-pan"),
    (14, V, "Screening night needs volunteer nurses and interpreters (Spanish, Somali). Three hours, Thursday evening, and you'll help a neighbor find a doctor.", 1.7, 2, None, ["health-workers-class.jpg", "health-trainer.jpg"], None),
    (16, V, "Night drivers wanted: one route a week, about 3 hours. You pick up from grocers at closing and drop at pantries by 7 am. Van and fuel provided.", 0.5, None, None, ["2015-feds-feeds-families-gleanin-35f8f1.webp", "2015-feds-feeds-families-gleanin-99f538.webp"], None),
    (19, V, "Creek cleanup Saturday at Mill Creek. Waders for the first 20 people. Bring a friend and we'll bring the coffee.", 2.0, 11, None, ["sharps-fire-planting-and-habitat-76e57a.webp"], "crooked-river-23467104578"),
    (22, D, "Fishing line season: we're treating 3 to 4 tangled birds a week. $300 covers a rescue run and first treatment. Help us get through the fall.", 1.2, 31, 6000, ["june-23-2010-largest-bird-releas-5e376d.webp", "american-kestrel-44273-5b4ec8.webp"], None),
    (24, V, "Thursday community dinner needs servers and dishwashers. Eat with us after. Our trainees cook; you help the room run.", 3.1, 2, None, ["20111031-fns-lsc-0110-6677167995-c640c7.webp", "20111031-fns-lsc-0131-6677173317-7d2288.webp"], None),
    (28, V, "Holiday sorting shifts are open. Two hours at the warehouse, no experience needed, and every box goes to a county pantry within the week.", 0.8, 8, None, ["20170922-osec-lsc-0197-366252589-3642b5.webp"], None),
    (32, V, "Last Sunday cleanup at the Canal Street launch. Kayakers especially welcome: there's a lot the shore crew can't reach.", 3.6, 18, None, ["trinity-river-cleanup-npld-31929-d49f55.webp", "september-15-2012-trash-collecte-54ab7f.webp"], "crooked-river-36648924083"),
    (33, D, "Help us build a second cold storage room. Farmers lose about a fifth of their harvest without it. Goal: $18,000 by spring planting.", 5.3, 60, 18000, ["20180828-fns-pjk-0119-toned-4344-59202e.webp", "20180828-fns-pjk-1006-toned-4344-935bcc.webp"], None),
    (34, D, "Laptop drive: $350 refurbishes one laptop a student can take home. We have a waitlist of 40 teens.", 2.9, 35, 14000, ["computer-programming-class-3110db.webp"], None),
    (36, V, "Bottle babies need foster homes now. We provide formula, heating pads, a scale and a mentor. Three weeks, big reward.", 0.4, None, None, ["a-kitten-in-the-hand-flickr-fd53c9.webp", "altai-kitten-with-dbe-gene-aaffaa.webp", "black-ticked-tabby-oriental-shor-756a6a.webp"], None),
    (40, D, "Our fall restoration fund matches community gifts for wetland projects. Every dollar raised here is granted to local restoration crews.", 8.0, 40, 50000, ["horsetail-wetland-restoration-si-1d3ab0.webp", "planting-native-grasses-on-a-rec-40fd1f.webp"], "autumn-cattails-at-sunset-in-east-kelown"),
    (41, V, "Teens 14 to 19: our grants committee has two open seats. You'll read applications and decide where $50,000 goes. Apply by the end of the month.", 6.4, 17, None, ["pier-62-skatepark-pool-looking-e-1a4da3.webp"], "freizeitsportzentrum-20230508-c0754"),
]
