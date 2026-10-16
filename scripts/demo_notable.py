"""Fictional public figures (F-113) and experiences (F-111), imported by gen-seed-demo.py.
All names are invented; none is meant to resemble a real person.
"""

# (n, handle, name, note, bio, [(org slug, amount, days ago)], [(org slug, kind, note)])
PUBLIC_FIGURES = [
    (1, "marisol_vega", "Marisol Vega", "Chef", "Chef and restaurateur. Every kitchen should feed its neighbors.",
     [("castro-street-community-kitchen", 25000, 40), ("harbor-table", 15000, 90), ("seedline-growers", 10000, 120)],
     [("castro-street-community-kitchen", "volunteered", "Cooked Tuesday dinner with the crew. 160 plates, zero waste, one very happy chef.")]),
    (2, "dev_ramaswamy", "Dev Ramaswamy", "Tech founder", "Founder. Funding the people who teach kids to build.",
     [("san-tomas-youth-robotics", 50000, 30), ("bright-lines-coding", 40000, 75), ("rengstorff-reading-club", 20000, 50)],
     [("san-tomas-youth-robotics", "attended", "Saw the build night. The all-girls team out-engineered my first startup.")]),
    (3, "june_okonkwo", "June Okonkwo", "Olympic rower", "Two-time Olympian. Clean water, open space, strong kids.",
     [("bayfront-wetlands-crew", 30000, 20), ("blue-heron-watershed", 25000, 100), ("greenway-stewards", 15000, 60)],
     [("bayfront-wetlands-crew", "volunteered", "Pulled ice plant all morning. Harder than a 2k on the erg, and more fun.")]),
    (4, "ellis_park", "Ellis Park", "Singer-songwriter", "Songs, and a guitar for every kid who wants one.",
     [("southside-music-lab", 35000, 45), ("quiet-harbor-peer-support", 20000, 25)],
     [("southside-music-lab", "gave", "Music kept me going as a teenager. This lab does that for 200 kids.")]),
    (5, "rosa_lindqvist", "Rosa Lindqvist", "Author", "Novelist. Libraries made me; I'm paying it back. Keeps the amounts private.",
     [], []),
]

# Notes for demo people's experiences (by kind).
NOTES = {
    "volunteered": [
        "Three hours flew by. The regulars made me feel like I'd been there for years.",
        "Well organized and really welcoming to first-timers. Going back next month.",
        "Brought my teenager. We both want to sign up again.",
        "Hard work, great people. You can see exactly where your time goes.",
        "They trained us in ten minutes and trusted us right away.",
    ],
    "gave": [
        "Their updates show exactly what my gift did. That's why I give monthly.",
        "Small team, big results. Easy decision.",
        "I saw their work up close first. Giving was the obvious next step.",
    ],
    "attended": [
        "The open house was a great way to see the work before signing up.",
        "Met the staff and a few volunteers. Very down to earth.",
    ],
}
