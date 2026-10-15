import { expect, test } from "@playwright/test"
import { sql, uniq } from "./helpers"


test("F-001 / F-027: Explore shows posts newest first, with photos, alt text and credits", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Okafor family").first()).toBeVisible()
  const keys = page.getByAltText("A hand holding house keys beside a door lock")
  await keys.scrollIntoViewIfNeeded()
  await expect(keys).toBeVisible()
  await expect(page.getByText("Photo: Shixart1985, CC BY 2.0, via Wikimedia Commons")).toBeVisible()
  // Newest first: post times on the page only go back in time.
  const times = await page.locator("article header time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!))
  expect(times.length).toBeGreaterThan(5)
  expect([...times].sort().reverse()).toEqual(times)
})

test("F-001: cause filter shows only orgs in that cause", async ({ page }) => {
  await page.goto("/?cause=environment")
  await expect(page.getByText("re-cut two miles of eroded trail").first()).toBeVisible()
  await expect(page.getByText("42 second graders")).toHaveCount(0)
  await page.goto("/?cause=education")
  await expect(page.getByText("42 second graders").first()).toBeVisible()
  await expect(page.getByText("grocery boxes went to 212 households")).toHaveCount(0)
})

test("F-032: org videos autoplay muted on screen and pause when scrolled away", async ({ page }) => {
  await page.goto("/o/greenway-stewards")
  // The same clip appears on a trail-crew call too; check the first one.
  const video = page.getByLabel("Volunteers with hand tools re-cutting a dirt trail across a dry hillside").first()
  await video.evaluate((v) => v.scrollIntoView({ block: "center" }))
  // Under a full parallel-ish run the dev server is slow to serve the clip; allow time to buffer.
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.muted && v.currentTime > 0), { timeout: 25_000 }).toBe(true)
  await expect(page.getByText("Video: BLM Oregon & Washington, public domain, via Wikimedia Commons").first()).toBeVisible()

  await page.mouse.wheel(0, 4000)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
})

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("F-032: videos don't autoplay when the device asks to reduce motion", async ({ page }) => {
    await page.goto("/o/greenway-stewards")
    const video = page.getByLabel("Volunteers with hand tools re-cutting a dirt trail across a dry hillside").first()
    await video.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  })
})

test("F-033: foundations and nonprofits look different, and the feed filters by type", async ({ page }) => {
  await page.goto("/")
  // Post headers stay quiet: foundations get a small landmark marker; nonprofits none.
  const foundationPost = page.locator("article").filter({ has: page.locator('header a[href="/o/lakeshore-community-foundation"]') }).first()
  await page.goto("/?type=foundation")
  await expect(foundationPost.locator('header [title="Foundation"]')).toHaveCount(1)
  await page.goto("/")
  const harborPost = page.locator("article").filter({ has: page.locator('header a[href="/o/harbor-table"]') }).first()
  await expect(harborPost.locator('header [title="Foundation"]')).toHaveCount(0)

  await page.getByRole("navigation", { name: "Filter by who's posting" }).getByRole("link", { name: "Foundations" }).click()
  await expect(page).toHaveURL(/type=foundation/)
  await expect(page.locator("article header [title='Foundation']").first()).toBeVisible()
  await expect(page.locator('article header a[href="/o/harbor-table"]')).toHaveCount(0)

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.locator("main h1 + span", { hasText: "Foundation" })).toBeVisible()
})

test("F-034 / F-035: foundation posts link confirmed grantees; profiles show Funded by and Grantees", async ({ page }) => {
  await page.goto("/o/lakeshore-community-foundation?tab=posts")
  const chips = page.locator("li").filter({ hasText: "for new walk-in freezer" })
  await expect(chips.first()).toContainText("$25,000")
  // Greenway hasn't confirmed its grant, so it isn't shown.
  await expect(page.getByText("for native plants for the riverbank")).toHaveCount(0)
  await chips.first().getByRole("link").click()
  await expect(page).toHaveURL(/\/o\/harbor-table$/)

  // Compact funders card beside the story; full details on About.
  await expect(page.getByRole("heading", { name: "Top supporters" }).first()).toBeVisible()
  await page.getByRole("link", { name: "About", exact: true }).click()
  await expect(page.getByText("$25,000, New walk-in freezer")).toBeVisible()

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.getByRole("heading", { name: "Grantees" })).toBeVisible()
  // Exact totals are unit-tested (grantTotals); other test runs may add grants here.
  await expect(page.getByText(/\$[\d,.]+M? to \d+ nonprofits, each confirmed by the grantee/)).toBeVisible()
  await expect(page.getByText("$18,000, Training 30 volunteer tutors")).toBeVisible()
})

test("F-036: a nonprofit's grant report links to the foundation and reaches its Portfolio", async ({ page }) => {
  await page.goto("/o/harbor-table")
  const banner = page.getByRole("link", { name: /Grant report for Lakeshore Community Foundation/ })
  await expect(banner).toContainText("$25,000 for new walk-in freezer")

  await page.goto("/o/lakeshore-community-foundation?tab=portfolio")
  await expect(page.locator("article").filter({ hasText: "The new walk-in freezer is in" }).first()).toBeVisible()

  await page.goto("/o/lakeshore-community-foundation?tab=posts")
  await expect(page.locator("li").filter({ hasText: "for new walk-in freezer" }).getByText("Report posted")).toBeVisible()
  await expect(page.locator("li").filter({ hasText: "for training 30 volunteer tutors" }).getByText("Report posted")).toHaveCount(0)

  await page.goto("/o/harbor-table")
  await banner.click()
  await expect(page).toHaveURL(/\/o\/lakeshore-community-foundation$/)
})

test("F-037: a foundation's Portfolio tab shows its grantees' reports; nonprofits have no Portfolio", async ({ page }) => {
  await page.goto("/o/lakeshore-community-foundation")
  await page.getByRole("link", { name: "Portfolio", exact: true }).click()
  await expect(page).toHaveURL(/tab=portfolio/)
  await expect(page.getByText("The new walk-in freezer is in.")).toBeVisible()

  await page.goto("/o/harbor-table")
  await expect(page.getByRole("link", { name: "Portfolio", exact: true })).toHaveCount(0)
  await page.goto("/o/harbor-table?tab=portfolio")
  await expect(page.getByRole("heading", { name: "Posts", exact: true })).toBeVisible()
})

test("F-039: /calls lists open calls soonest deadline first; closed calls drop off but say Closed on their post", async ({ page }) => {
  await page.goto("/calls")
  // List pages stream in behind a loading skeleton; wait for the content before reading it.
  await expect(page.getByText("Youth reading micro-grants").first()).toBeVisible()
  const text = await page.locator("main").innerText()
  expect(text.indexOf("Youth reading micro-grants")).toBeGreaterThan(-1)
  expect(text.indexOf("Youth reading micro-grants")).toBeLessThan(text.indexOf("Spring Community Fund grants are open"))
  await expect(page.getByText("Summer meals grants")).toHaveCount(0)

  const youth = page.locator("article").filter({ hasText: "Youth reading micro-grants" })
  await expect(youth.getByText("Closing soon")).toBeVisible()
  await expect(youth.getByRole("link", { name: "Apply" })).toHaveAttribute("href", "https://example.org/riverside/reading-grants")

  await page.goto("/calls?cause=housing")
  await expect(page.getByText("Spring Community Fund grants are open")).toBeVisible()
  await expect(page.getByText("Youth reading micro-grants")).toHaveCount(0)

  await page.goto("/o/riverside-family-foundation?tab=posts")
  const closed = page.locator("article").filter({ hasText: "Summer meals grants" })
  await expect(closed.getByText("Closed", { exact: true })).toBeVisible()
  await expect(closed.getByRole("link", { name: "Apply" })).toHaveCount(0)
})

test("F-040: a nonprofit funded by two foundations shows as co-funded", async ({ page }) => {
  await page.goto("/o/harbor-table")
  await expect(page.getByRole("link", { name: /Co-funded by Lakeshore Community Foundation and 1 other/ })).toBeVisible()
  await page.goto("/o/harbor-table?tab=about")
  await expect(page.getByRole("heading", { name: "Funded by" })).toBeVisible()
  await expect(page.getByText("$10,000, Fresh produce program")).toBeVisible()
  await page.goto("/o/riverbend-readers")
  await expect(page.getByRole("link", { name: /Backed by Lakeshore Community Foundation/ })).toBeVisible()
})

test("F-041: feeds page with 'Show older posts'; every post appears exactly once, even with tied timestamps", async ({ page }) => {
  const id = uniq()
  const slug = `paging-${id}`
  const [org] = await sql`insert into orgs (slug, name, status) values (${slug}, ${`Paging Org ${id}`}, 'verified') returning id`
  try {
    // 23 posts, one per hour; posts #20 and #21 share a timestamp, right at the page boundary.
    // One fixed base time: separate statements would each get a different now() and never tie.
    const [{ base }] = await sql`select now() as base`
    for (let i = 1; i <= 23; i++) {
      const hoursAgo = i <= 20 ? i : i - 1
      await sql`insert into posts (org_id, body, created_at) values (${org.id}, ${`Paging post ${i} of ${id}`}, ${base}::timestamptz - make_interval(hours => ${hoursAgo}))`
    }
    const [{ ties }] = await sql`select count(*)::int - count(distinct created_at)::int as ties from posts where org_id = ${org.id}`
    expect(ties).toBe(1)
    const bodiesOnPage = async () => (await page.locator("main article p").allInnerTexts()).filter((t) => t.includes(`of ${id}`))

    await page.goto(`/o/${slug}?tab=posts`)
    const first = await bodiesOnPage()
    expect(first).toHaveLength(20)
    await page.getByRole("link", { name: "Show older posts" }).click()
    await expect(page).toHaveURL(/before=/)
    await expect(page.getByText("You're all caught up")).toBeVisible()
    const second = await bodiesOnPage()
    expect(second).toHaveLength(3)
    await expect(page.getByText("You're all caught up")).toBeVisible()
    expect(new Set([...first, ...second]).size).toBe(23)

    await page.getByRole("link", { name: "Back to newest" }).click()
    await expect(page).not.toHaveURL(/before=/)
    await expect(page.getByRole("link", { name: "Show older posts" })).toBeVisible()
    expect(await bodiesOnPage()).toEqual(first)

    // A tampered cursor is ignored (first page), not an error.
    await page.goto(`/o/${slug}?tab=posts&before=${encodeURIComponent("bad),or(true")}`)
    expect(await bodiesOnPage()).toHaveLength(20)
  } finally {
    await sql`delete from orgs where id = ${org.id}`
  }
})

test("F-047: shared posts and profiles have branded preview images", async ({ page, request }) => {
  await page.goto("/o/harbor-table?tab=posts")
  await page.locator("article").filter({ hasText: "The new walk-in freezer is in." }).getByRole("link", { name: "Open post" }).click()
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
  // Link previews come from the server HTML a crawler fetches (not the client-side DOM).
  const html = await (await request.get(page.url())).text()
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]
  expect(html.match(/<meta property="og:image" /g)).toHaveLength(1)
  expect(og).toMatch(/\/p\/[0-9a-f-]{36}\/opengraph-image/)
  const img = await request.get(og!)
  expect(img.status()).toBe(200)
  expect(img.headers()["content-type"]).toBe("image/png")

  const orgImg = await request.get("/o/lakeshore-community-foundation/opengraph-image")
  expect(orgImg.headers()["content-type"]).toBe("image/png")
})

test("F-003 / F-024 / F-021: org profile tabs and footnoted impact stats", async ({ page }) => {
  await page.goto("/o/open-door-homes")
  await expect(page.getByRole("heading", { name: "Open Door Homes" })).toBeVisible()
  // Home: impact figures beside the story, footnoted to their source.
  await expect(page.getByRole("region", { name: "Impact so far" }).getByRole("link", { name: "example.org" })).toHaveAttribute("href", /open-door\/outcomes/)
  await page.getByRole("link", { name: "About", exact: true }).click()
  await expect(page).toHaveURL(/tab=about/)
  await expect(page.getByRole("link", { name: "Source 1" }).first()).toBeVisible()
  await expect(page.locator("#source-1")).toContainText("example.org/open-door/outcomes")
  await expect(page.getByText("EIN and staff email checked by imnet")).toBeVisible()
  await page.goto("/o/open-door-homes?tab=nonsense")
  await expect(page.getByRole("heading", { name: "Posts", exact: true })).toBeVisible()
})

test("F-003: unknown org is a 404", async ({ page }) => {
  const res = await page.goto("/o/does-not-exist")
  expect(res?.status()).toBe(404)
})

test("F-025: search finds orgs by name", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Search" }).fill("river")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("region", { name: "Organizations" }).getByRole("link", { name: /Riverbend Readers/ })).toBeVisible()
})

test("F-002: Following requires sign-in", async ({ page }) => {
  await page.goto("/following")
  await expect(page).toHaveURL(/\/login(\?next=%2F|\?next=\/)following$/)
})

test("F-051: a profile lists current needs with a way to help; met needs say so", async ({ page }) => {
  await page.goto("/o/harbor-table")
  const panel = page.getByRole("region", { name: "Current needs" })
  await expect(panel.getByRole("link", { name: "Help with Saturday dinner crew" })).toHaveAttribute("href", "https://example.org/harbor-table/volunteer")
  await expect(panel.getByText("Walk-in cooler repair")).toBeVisible()
  await expect(panel.getByText(/Met .*Thank you\./)).toBeVisible()
  // Signed-out visitors can't send thank-you notes.
  await expect(page.getByRole("button", { name: "Send a thank-you note" })).toHaveCount(0)
})

test("F-054: Ways to help lists open needs across orgs and filters by cause", async ({ page }) => {
  await page.goto("/needs")
  await expect(page.getByRole("heading", { name: "Ways to help", level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: "Help with Saturday dinner crew" })).toBeVisible()
  await expect(page.getByText("Walk-in cooler repair")).toHaveCount(0) // met needs drop off

  await page.goto("/needs?cause=animals")
  await expect(page.getByRole("link", { name: "Help with Blankets and towels" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Help with Saturday dinner crew" })).toHaveCount(0)

})

test("F-085: Home's Calls to help card toggles between volunteer and donation calls", async ({ page }) => {
  await page.goto("/")
  const card = page.getByRole("region", { name: "Calls to help" })
  await expect(card.getByRole("tab", { name: "Volunteer" })).toHaveAttribute("aria-selected", "true")
  await expect(card.getByRole("link", { name: /^Sign up/ }).first()).toBeVisible()
  await card.getByRole("tab", { name: "Donate" }).click()
  await expect(card.getByRole("tab", { name: "Donate" })).toHaveAttribute("aria-selected", "true")
  await expect(card.getByRole("link", { name: /^Donate/ }).first()).toBeVisible()
  await expect(card.getByText(/\$[\d,]+ goal/).first()).toBeVisible()
  await card.getByRole("link", { name: "See all donation calls" }).click()
  await expect(page).toHaveURL(/\/needs\?show=donate/)
})

test("F-058: events list soonest first with a cause filter; profiles and Home show upcoming events", async ({ page }) => {
  await page.goto("/events")
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible()
  const titles = await page.locator("main li a.font-semibold").allTextContents()
  expect(titles.indexOf("Free screening night")).toBeLessThan(titles.indexOf("Holiday meal packing night"))

  await page.goto("/events?cause=animals")
  await expect(page.getByText("Adoption day", { exact: true })).toBeVisible()
  await expect(page.getByText("Free screening night", { exact: true })).toHaveCount(0)

  await page.goto("/o/harbor-table")
  const panel = page.getByRole("region", { name: "Upcoming events" })
  await expect(panel.getByText("Community dinner and kitchen tour", { exact: true })).toBeVisible()
  // Signed out, RSVP leads to sign-in.
  await expect(panel.getByRole("link", { name: /Going\? to Community dinner and kitchen tour \(sign in\)/ })).toHaveAttribute("href", "/login")

  await page.goto("/")
  await expect(page.getByRole("region", { name: "Upcoming events" }).getByRole("link", { name: "See all events" })).toBeVisible()
})

test("F-062 / F-063: LinkedIn-style posts: header, action bar, inline comments with nested Author replies", async ({ page }) => {
  await page.goto("/")
  const first = page.locator("article").first()
  await expect(first.getByText(/\d[\d,]* followers?/)).toBeVisible()
  for (const name of ["This moved me (sign in)", "Share", "Save (sign in)"]) await expect(first.getByRole(name === "Share" ? "button" : "link", { name, exact: true })).toBeVisible()
  await expect(first.getByRole("button", { name: /^Comment( \d+ comments?)?$/ })).toBeVisible()
  await first.getByRole("button", { name: /^Comment( \d+ comments?)?$/ }).click()
  const inline = first.getByRole("region", { name: "Comments" })
  await expect(inline.getByRole("link", { name: "Sign in" })).toBeVisible()
  await expect(inline.locator("time").first()).toBeVisible()

  // A post whose Author reply sits under one of the five newest threads (older ones are behind "Load more").
  const [post] = await sql`select r.post_id as id from comments r
   where r.as_org and r.parent_id in (
     select t.id from comments t where t.post_id = r.post_id and t.parent_id is null order by t.created_at desc limit 5)
   order by r.post_id limit 1`
  await page.goto(`/p/${post.id}`)
  const section = page.getByRole("region", { name: "Comments" })
  await expect(section.getByText("Author").first()).toBeVisible()
  // Top-level comments newest first.
  const tops = await section.locator(":scope > ul > li > div time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!))
  expect([...tops].sort().reverse()).toEqual(tops)
  // No like-style counts for visitors: the comment count is public (0015), "moved" is not.
  await expect(page.getByText(/\d+ (replies|reactions?|likes?|people moved)\b/)).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Comment \d+ comments?$/ })).toBeVisible()
})

test("F-064: feed posts preview their newest comment; 'See more comments' opens the thread", async ({ page }) => {
  await page.goto("/o/harbor-table?tab=posts")
  const card = page.locator("article").filter({ hasText: "The new walk-in freezer is in." }).first()
  const [post] = await sql`select id from posts where body like 'The new walk-in freezer is in.%'`
  const [latest] = await sql`select body from comments where post_id = ${post.id} and parent_id is null order by created_at desc limit 1`
  await expect(card.getByText(latest.body, { exact: true })).toBeVisible()
  await expect(card.getByRole("region", { name: "Comments" })).toHaveCount(0)
  await card.getByRole("button", { name: "See more comments" }).click()
  await expect(card.getByRole("region", { name: "Comments" })).toBeVisible()
})

test("F-065: comments from opted-in donors to the org carry a Donor badge", async ({ page }) => {
  const [row] = await sql`select distinct on (c.post_id) c.post_id, donor(c) d from comments c where c.parent_id is null order by c.post_id, c.created_at desc`.then((rows) => rows.filter((r) => r.d))
  await page.goto(`/p/${row.post_id}`)
  const badge = page.getByRole("region", { name: "Comments" }).getByTitle(/Has given to .* \(self-reported\)/).first()
  await expect(badge).toBeVisible()
  await expect(badge).toContainText("Donor")
})

test("F-068: search covers organizations, people and posts, with tabs", async ({ page }) => {
  await page.goto("/search?q=harbor")
  await expect(page.getByRole("region", { name: "Organizations" }).getByRole("link", { name: /Harbor Table/ })).toBeVisible()
  await expect(page.getByRole("region", { name: "Posts" })).toBeVisible()
  await page.getByRole("navigation", { name: "Result types" }).getByRole("link", { name: "People" }).click()
  await page.getByRole("searchbox", { name: "Search", exact: true }).first().fill("Dana Rivera")
  await page.getByRole("searchbox", { name: "Search", exact: true }).first().press("Enter")
  await expect(page.getByRole("region", { name: "People" }).getByRole("link", { name: /Dana Rivera/ })).toBeVisible()
  await expect(page.getByRole("region", { name: "Organizations" })).toHaveCount(0)
  // Characters that could inject filter conditions are harmless.
  const res = await page.goto("/search?q=" + encodeURIComponent("a,handle.neq.x)") + "&type=people")
  expect(res?.status()).toBe(200)
})

test("F-066: profiles have About and Activity; opted-in donors show 'Has given to'", async ({ page }) => {
  const [p] = await sql`select pr.handle from profiles pr where pr.donor_badge and not pr.show_giving_totals and exists (select 1 from gifts g where g.user_id = pr.id)
    and exists (select 1 from comments c where c.user_id = pr.id and not c.as_org) order by pr.handle limit 1`
  await page.goto(`/u/${p.handle}`)
  await expect(page.getByRole("heading", { name: "Has given to" })).toBeVisible()
  await page.getByRole("navigation", { name: "Profile sections" }).getByRole("link", { name: "activity" }).click()
  await expect(page).toHaveURL(/tab=activity/)
  const [c] = await sql`select c.body from comments c join profiles pr on pr.id = c.user_id where pr.handle = ${p.handle} and not c.as_org order by c.created_at desc limit 1`
  await expect(page.getByRole("region", { name: "Comments" }).getByText(c.body, { exact: true }).first()).toBeVisible()
})

test("F-070: people have illustrated avatars served from our own route", async ({ page, request }) => {
  await page.goto("/u/dana_demo")
  const avatar = page.locator('img[src="/avatars/dana_demo"]').first()
  await expect(avatar).toBeVisible()
  const res = await request.get("/avatars/dana_demo")
  expect(res.headers()["content-type"]).toContain("image/svg+xml")
  expect((await request.get("/avatars/" + encodeURIComponent("<script>"))).status()).toBe(404)
})

test("F-073: profiles look complete: cover photos, location, founded, team, programs, About", async ({ page }) => {
  await page.goto("/o/harbor-table")
  await expect(page.locator('main img[src$="00000000-0000-4000-a000-000000000001/cover.webp"]')).toBeVisible()
  await expect(page.getByText("Portland, ME").first()).toBeVisible()
  await expect(page.getByText("Founded 2011")).toBeVisible()
  await page.getByRole("link", { name: "About", exact: true }).click()
  await expect(page.getByText("14 staff · 320 volunteers").first()).toBeVisible()
  await expect(page.getByRole("listitem").filter({ hasText: "Pantry Saturdays" })).toBeVisible()

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.locator('main img[src$="/cover.webp"]')).toBeVisible()
  await expect(page.getByText("Milwaukee, WI").first()).toBeVisible()

  await page.goto("/u/dana_demo")
  await expect(page.locator('main img[src$="covers/mountain-lake.webp"]')).toBeVisible()
  await expect(page.getByText("Milwaukee, WI").first()).toBeVisible()
  await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Giving" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Edit profile" })).toHaveCount(0) // not yours
})

test("F-074: events open their own page: host, when, where, add to calendar, more events", async ({ page, request }) => {
  await page.goto("/events")
  await page.getByRole("link", { name: "Community dinner and kitchen tour", exact: true }).click()
  await expect(page).toHaveURL(/\/e\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { level: 1, name: "Community dinner and kitchen tour" })).toBeVisible()
  await expect(page.getByText("Event by")).toBeVisible()
  await expect(page.getByRole("link", { name: "Open in Maps" })).toHaveAttribute("href", /google\.com\/maps\/search/)
  await expect(page.getByRole("heading", { name: "Hosted by" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Going\? to Community dinner and kitchen tour/ })).toBeVisible() // signed out: leads to sign-in
  const ics = await request.get(page.url() + "/calendar.ics")
  expect(ics.headers()["content-type"]).toContain("text/calendar")
  expect(await ics.text()).toContain("SUMMARY:Community dinner and kitchen tour")
  // No attendee counts.
  await expect(page.getByText(/\d+ (attendees?|going)/i)).toHaveCount(0)
  expect((await request.get("/e/00000000-0000-4000-a000-000000000999")).status()).toBe(404)
})

test("F-076 / B-028: an opted-in donor's profile shows total giving, amounts by organization and causes supported", async ({ page }) => {
  await page.goto("/u/dana_demo")
  const panel = page.getByRole("region", { name: "Giving" })
  await expect(panel.getByText(/^\$[\d,]+$/).first()).toBeVisible()
  await expect(panel.getByText(/given to \d+ organizations? since/)).toBeVisible()
  await expect(panel.getByRole("heading", { name: "Causes supported" })).toBeVisible()
  await expect(panel.getByRole("link", { name: "Hunger & Food" })).toBeVisible()
  await expect(panel.getByText(/\d+%/)).toHaveCount(0) // B-028: no invented per-cause split
  // F-077: amount to each organization, largest first.
  const orgRow = panel.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Harbor Table" }) })
  await expect(orgRow.getByText(/^\$[\d,]+$/)).toBeVisible()
  await expect(panel.getByText(/Self-reported/)).toBeVisible()
  // What their giving became no longer repeats grant reports.
  await expect(page.getByText(/Latest report/)).toHaveCount(0)
})

test("F-078: a nonprofit shows its top supporters: foundations by confirmed grants and opted-in donors, with amounts", async ({ page }) => {
  await page.goto("/o/harbor-table")
  const card = page.getByRole("region", { name: "Top supporters" }).first()
  const lakeshore = card.getByRole("listitem").filter({ hasText: "Lakeshore Community Foundation" })
  await expect(lakeshore).toContainText("$25,000")
  // Opted-in individual donors, with self-reported totals, link to their profiles.
  await expect(card.locator('a[href^="/u/"]').first()).toBeVisible()
  await expect(card.getByText(/People: self-reported/)).toBeVisible()
  await expect(card.getByText(/Foundations: confirmed grants/)).toBeVisible()
})

test("F-079: the Donors tab shows posts by people, with spotlighted organizations and comments", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("navigation", { name: "Filter by who's posting" }).getByRole("link", { name: "Donors" }).click()
  await expect(page).toHaveURL(/type=donor/)
  const post = page.locator("article").filter({ hasText: "Harbor Table needs dinner crew" }).first()
  await expect(post).toBeVisible()
  await expect(post.locator('a[href^="/u/"]').first()).toBeVisible()
  await expect(post.getByRole("link", { name: /Harbor Table.*View/ })).toHaveAttribute("href", "/o/harbor-table")
  // Only people's posts here: no org headers.
  await expect(page.locator("article header a[href^='/o/']")).toHaveCount(0)
  await expect(page.getByRole("navigation", { name: "Filter by cause" })).toHaveCount(0)
})

test("F-081: an opted-in donor's profile shows volunteer hours by organization", async ({ page }) => {
  await page.goto("/u/dana_demo")
  const panel = page.getByRole("region", { name: "Volunteering" })
  await expect(panel.getByText("20.5 hours")).toBeVisible()
  await expect(panel.getByRole("listitem").filter({ hasText: "Harbor Table" })).toContainText("17.5 hours")
  await expect(panel.getByRole("listitem").filter({ hasText: "Bridge Welcome Center" })).toContainText("3 hours")
})

test("F-083: the header search suggests organizations, people and events as you type; keyboard works", async ({ page }) => {
  await page.goto("/")
  const box = page.getByRole("combobox", { name: "Search" })
  await box.fill("harb")
  const list = page.getByRole("listbox", { name: "Suggestions" })
  await expect(list.getByRole("option", { name: /Harbor Table/ })).toBeVisible()
  await box.press("ArrowDown")
  await expect(list.getByRole("option").first()).toHaveAttribute("aria-selected", "true")
  await box.press("Enter")
  await expect(page).toHaveURL(/\/o\/harbor-table$/)

  await page.goto("/")
  await box.fill("planting")
  await expect(page.getByRole("listbox", { name: "Suggestions" }).getByRole("option", { name: /Planting day/ })).toBeVisible()
  await box.press("Escape")
  await expect(page.getByRole("listbox", { name: "Suggestions" })).toHaveCount(0)
  await page.getByRole("combobox", { name: "Search" }).fill("dinner")
  await page.getByRole("link", { name: /See all results for/ }).click()
  await expect(page).toHaveURL(/\/search\?q=dinner/)
  await expect(page.getByRole("region", { name: "Events" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Ways to help" })).toBeVisible() // search results section
})

test("F-084: Ways to help shows calls for volunteers and donations, with photos, video and the right button", async ({ page }) => {
  await page.goto("/needs")
  await page.getByRole("navigation", { name: "Ways to help" }).getByRole("link", { name: "Volunteer" }).click()
  await expect(page).toHaveURL(/show=volunteer/)
  const vol = page.locator("article").filter({ hasText: "Saturday dinner crew this month" }).first()
  await expect(vol.getByText("Volunteers needed").first()).toBeVisible()
  await expect(vol.getByRole("link", { name: /Sign up/ })).toHaveAttribute("href", /^https:\/\/example\.org\//)
  await expect(vol.locator("img[alt]").first()).toBeVisible()
  await expect(page.locator("article").filter({ hasText: "Donations needed" })).toHaveCount(0)

  await page.getByRole("navigation", { name: "Ways to help" }).getByRole("link", { name: "Donate" }).click()
  const don = page.locator("article").filter({ hasText: "walk-in cooler is 19 years old" }).first()
  await expect(don.getByText("Goal $8,500")).toBeVisible()
  await expect(don.getByRole("link", { name: /Donate/ })).toBeVisible()
  await expect(page.locator("article video").first()).toBeAttached() // some calls carry video
})

test("F-091: Home's right column shows calls to help and upcoming events, not org suggestions", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Calls to help" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Add to your feed" })).toHaveCount(0)
})

test("B-033: cause chips stay in place when one is selected", async ({ page }) => {
  await page.goto("/calls")
  const chip = page.getByRole("navigation", { name: "Filter by cause" }).getByRole("link", { name: "Health", exact: true })
  const before = (await chip.boundingBox())!.x
  await chip.click()
  await expect(chip).toHaveAttribute("aria-current", "page")
  expect(Math.round((await chip.boundingBox())!.x)).toBe(Math.round(before))
})

test("F-100: communities are public to browse; their chats are for members only", async ({ page }) => {
  await page.goto("/communities")
  await expect(page.getByRole("heading", { name: "Communities", level: 1 })).toBeVisible()
  await page.getByRole("link", { name: /Monthly givers circle/ }).click()
  await expect(page.getByRole("link", { name: "Join community" }).first()).toHaveAttribute("href", /\/login\?next=\/communities\/monthly-givers-circle/)
  await expect(page.getByRole("region", { name: "Members" }).getByText("to see who's in it")).toBeVisible() // member lists need sign-in
  await expect(page.getByRole("log")).toHaveCount(0)
  await expect(page.getByText("tip changed everything")).toHaveCount(0) // no chat content leaks
  await page.goto("/messages")
  await expect(page).toHaveURL(/\/login/)
})

test("F-101: Near you lists volunteering, events and communities by distance from your location", async ({ browser }) => {
  const ctx = await browser.newContext({ geolocation: { latitude: 37.8044, longitude: -122.2712 }, permissions: ["geolocation"] }) // Oakland
  const page = await ctx.newPage()
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort()) // no network in tests
  await page.goto("/nearby")
  await page.getByRole("button", { name: /Use my location|Using your location/ }).click()
  await expect(page.getByRole("button", { name: "Using your location" })).toBeVisible()
  const list = page.getByRole("region", { name: "Near you" })
  await expect(list.getByRole("link", { name: "Oakland creek cleanup crew" })).toBeVisible()
  await expect(list.getByText(/^Here$|\d+(\.\d)? mi/).first()).toBeVisible()
  // F-105: the organizations themselves, foundations and nonprofits, are on the map too.
  await expect(list.getByRole("link", { name: "Bayside Neighbors Fund", exact: true })).toBeVisible()
  await expect(list.getByRole("link", { name: "Pine Street Tutoring", exact: true })).toBeVisible()
  // Far-away places stay off the 25-mile list.
  await expect(list.getByRole("link", { name: "Portland weekend food volunteers" })).toHaveCount(0)
  // Filters: hide communities.
  await page.getByRole("button", { name: "Communities", pressed: true }).click()
  await expect(list.getByRole("link", { name: "Oakland creek cleanup crew" })).toHaveCount(0)
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible()
  await ctx.close()
})

test("F-102: Communities opens with communities near you (list and map), nearest first", async ({ browser }) => {
  const ctx = await browser.newContext({ geolocation: { latitude: 37.3894, longitude: -122.0819 }, permissions: ["geolocation"] }) // Mountain View
  const page = await ctx.newPage()
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort())
  await page.goto("/communities")
  const near = page.getByRole("region", { name: "Communities near you" })
  await expect(near.getByText("Around your current location")).toBeVisible()
  const first = near.getByRole("listitem").first()
  await expect(first).toContainText(/Mountain View|South Bay/)
  await expect(first).toContainText(/\d(\.\d)? mi/)
  // It comes before Discover on the page, with the map beside it.
  const nearTop = (await near.boundingBox())!.y
  expect(nearTop).toBeLessThan((await page.getByRole("heading", { name: /Discover/ }).boundingBox())!.y)
  await expect(page.getByRole("application", { name: "Map of places near you" })).toBeVisible()
  // F-103: communities have pictures, in the list and as map pins.
  await expect(first.locator("img[src*='/communities/']")).toBeVisible()
  await expect(page.locator(".pin-pic").first()).toBeVisible()
  // F-106: nearby nonprofits and foundations can join the map, with a legend saying which is which.
  await expect(page.getByRole("button", { name: "Foundations", pressed: true })).toBeVisible()
  await expect(page.getByText("Foundation", { exact: true }).last()).toBeVisible()
  await ctx.close()
})
