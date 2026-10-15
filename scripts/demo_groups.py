"""Communities and their chats (F-100), imported by gen-seed-demo.py. Fictional people and orgs only.

(n, slug, name, description, cause, owner person index, members, [(author, hours ago, text)])
LOCATIONS: each community's home city for the Near you map (F-101); None = no fixed place.
author 0 is the owner; author k > 0 is the k-th other member (stable order per group).
"""

GROUPS = [
    (1, "portland-weekend-food-volunteers", "Portland weekend food volunteers",
     "Saturday kitchen shifts, pantry sorts and night food rescue runs around Portland. Swap shifts, find a ride, ask anything.",
     "hunger", 12, 46, [
         (0, 70, "Welcome, everyone! This is the place to coordinate weekend shifts. Harbor Table's Saturday dinner crew still needs 12 people this month."),
         (3, 68, "I can do the 3 to 7 this Saturday. First time, anything I should bring?"),
         (0, 67, "Closed-toe shoes and an appetite. They feed volunteers after service."),
         (7, 50, "Eastgate is short a night driver on Thursdays if anyone has a license and three hours."),
         (5, 49, "I've done that route twice. The 5 am pantry drop is quiet and kind of beautiful."),
         (9, 30, "Anyone carpooling from the east side Saturday? I have two seats."),
         (3, 29, "Yes please! I'm near 82nd."),
         (2, 6, "Back from today's shift. 140 dinners, and the new walk-in freezer is a game changer."),
         (0, 5, "Thank you all. Next Saturday's sign-up is on Harbor Table's page."),
     ]),
    (2, "monthly-givers-circle", "Monthly givers circle",
     "People who give a little every month. We share how we choose, what we've learned, and what our giving became.",
     None, 31, 64, [
         (0, 140, "Kicking this off: I give $40 a month split across three local groups. How do you all decide?"),
         (4, 139, "I pick one cause a year and go deep. This year it's housing."),
         (8, 120, "I check whether my employer matches first. Doubled my giving without changing my budget."),
         (2, 98, "That tip changed everything for me too. Ours matches up to $1,000."),
         (11, 72, "Does anyone else keep a giving journal? Seeing the year's total made me want to keep going."),
         (0, 71, "I started one here last month. Logging is quick and it stays private."),
         (6, 26, "Lakeshore's grant report on the walk-in freezer made my month. That's where some of my gift went."),
         (9, 4, "Question for the group: one-time gifts or monthly? Organizations I asked prefer monthly so they can plan."),
     ]),
    (3, "street-tree-planters", "Street tree planters",
     "Planting days, watering rotations and tree-care tips for the hottest blocks in the city.",
     "environment", 48, 38, [
         (0, 96, "Planting day on Delmar Street is set: 120 trees, three hours. Greenway brings shovels and coffee."),
         (2, 95, "Count me in. Should we bring our own gloves?"),
         (0, 94, "Gloves are provided but bring your favorite pair if you have one."),
         (5, 52, "Watering rotation for the new trees starts next week. Two people per block, once a week, through October."),
         (1, 51, "I'll take Maple and 9th."),
         (7, 12, "Saw the red maples leafing out on our block today. Small thing, big joy."),
     ]),
    (4, "foster-kitten-network-fosters", "Kitten fosters",
     "Bottle babies, weigh-ins and the occasional 3 am question. Everyone welcome, from first-timers to old hands.",
     "animals", 66, 29, [
         (0, 80, "New fosters: weigh daily at the same time and write it down. Steady gain is what matters."),
         (3, 60, "My two are at 310g and 295g after week one. Is that on track?"),
         (0, 59, "Right on track. Call the foster line if anyone drops two days in a row."),
         (6, 33, "Heating pad tip: cover half the box so they can move off it when they want."),
         (2, 9, "Ours go back for adoption Saturday. I already miss them."),
     ]),
    (5, "youth-mentors", "Youth mentors",
     "Tutors and mentors who show up every week. Share what's working, swap resources, and support each other.",
     "youth", 85, 34, [
         (0, 110, "One hour a week, same student, all year. That consistency is the whole thing."),
         (4, 88, "Our coding club has a waitlist of 40 teens. If you know JavaScript, they'd love you."),
         (2, 60, "Anyone have good reading games for third graders? Mine is losing interest in flashcards."),
         (5, 59, "We play 'read the menu' with real takeout menus. Works every time."),
         (1, 20, "My student read a whole chapter book aloud today. I'm still smiling."),
     ]),
    (6, "health-screening-volunteers", "Health screening volunteers",
     "Nurses, interpreters and greeters for free community screening nights.",
     "health", 102, 22, [
         (0, 72, "Thursday screening night needs two more interpreters (Spanish, Somali) and one greeter."),
         (2, 70, "I can interpret Spanish from 5 to 8."),
         (3, 40, "First time greeting. What's the most useful thing I can do?"),
         (0, 39, "Make people feel welcome and walk them to the right table. That's most of it."),
     ]),
]

LOCATIONS = {
    "portland-weekend-food-volunteers": "Portland, ME", "monthly-givers-circle": None, "street-tree-planters": "Boulder, CO",
    "foster-kitten-network-fosters": "Portland, OR", "youth-mentors": "Austin, TX", "health-screening-volunteers": "Kansas City, MO",
    "bay-area-giving-circle": "San Francisco, CA", "oakland-creek-cleanup-crew": "Oakland, CA",
}

GROUPS += [
    (7, "bay-area-giving-circle", "Bay Area giving circle",
     "Neighbors who pool small monthly gifts and decide together where they go. Meetups once a month in the Mission.",
     None, 140, 41, [
         (0, 90, "This month's pool is $1,840 from 37 of us. Nominations for where it goes are open until Friday."),
         (3, 70, "Nominating Pine Street Tutoring in Oakland. Their volunteers show up every week."),
         (5, 50, "Seconding that. I visited their Thursday session, and the kids run the room."),
         (0, 8, "Vote closes Sunday. Meetup is the 28th, same cafe."),
     ]),
    (8, "oakland-creek-cleanup-crew", "Oakland creek cleanup crew",
     "Monthly creek and shoreline cleanups around Oakland. Gloves and grabbers provided; bring water and a friend.",
     "environment", 160, 27, [
         (0, 60, "Next cleanup: Sausal Creek, Saturday 9 am. Meet at the Dimond Park entrance."),
         (2, 40, "Last time we pulled 14 bags out of a 200-yard stretch. Let's beat it."),
         (4, 10, "Bringing my teenager this time. Is 14 okay?"),
         (0, 9, "Absolutely, with a parent. See you both there!"),
     ]),
]
