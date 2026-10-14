import { expect, test } from "@playwright/test"
import { sql, uniq } from "./helpers"


test("F-001 / F-027: Explore shows posts newest first, with photos, alt text and credits", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Okafor family").first()).toBeVisible()
  const keys = page.getByAltText("A hand holding house keys beside a door lock")
  await keys.scrollIntoViewIfNeeded()
  await expect(keys).toBeVisible()
  await expect(page.getByText("Photo: Shixart1985, CC BY 2.0, via Wikimedia Commons")).toBeVisible()
  // Newest first: the 1-day-old Okafor story comes before the 2-day-old pantry story.
  const text = await page.locator("main").innerText()
  expect(text.indexOf("Okafor family")).toBeLessThan(text.indexOf("10,000th family visit"))
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
  const video = page.getByLabel("Volunteers with hand tools re-cutting a dirt trail across a dry hillside")
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
    const video = page.getByLabel("Volunteers with hand tools re-cutting a dirt trail across a dry hillside")
    await video.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  })
})

test("F-033: foundations and nonprofits look different, and the feed filters by type", async ({ page }) => {
  await page.goto("/")
  // Post headers stay quiet: foundations get a small landmark marker; nonprofits none.
  const grantPost = page.locator("article").filter({ hasText: "Fall Community Fund grants are out" }).first()
  await expect(grantPost.locator('header [title="Foundation"]')).toHaveCount(1)
  const harborPost = page.locator("article").filter({ hasText: "10,000th family visit" }).first()
  await expect(harborPost.locator('header [title="Foundation"]')).toHaveCount(0)

  await page.getByRole("navigation", { name: "Filter by organization type" }).getByRole("link", { name: "Foundations" }).click()
  await expect(page).toHaveURL(/type=foundation/)
  await expect(page.getByText("Fall Community Fund grants are out")).toBeVisible()
  await expect(page.getByText("10,000th family visit")).toHaveCount(0)

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

  await expect(page.getByRole("heading", { name: "Funded by" })).toBeVisible()
  await expect(page.getByText("$25,000, New walk-in freezer")).toBeVisible()

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.getByRole("heading", { name: "Grantees" })).toBeVisible()
  // Exact totals are unit-tested (grantTotals); other test runs may add grants here.
  await expect(page.getByText(/\$[\d,.]+M? to \d+ nonprofits, each confirmed by the grantee/)).toBeVisible()
  await expect(page.getByText("$18,000, Training 30 volunteer tutors")).toBeVisible()
})

test("F-036: a nonprofit's grant report links to the foundation and shows on its Grantees list", async ({ page }) => {
  await page.goto("/o/harbor-table")
  const banner = page.getByRole("link", { name: /Grant report for Lakeshore Community Foundation/ })
  await expect(banner).toContainText("$25,000 for new walk-in freezer")

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.getByRole("link", { name: /Latest report: The new walk-in freezer is in/ })).toBeVisible()

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
  await expect(page.getByRole("heading", { name: "Recent posts" })).toBeVisible()
})

test("F-039: /calls lists open calls soonest deadline first; closed calls drop off but say Closed on their post", async ({ page }) => {
  await page.goto("/calls")
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
    await expect(page.getByText("You're all caught up.")).toBeVisible()
    const second = await bodiesOnPage()
    expect(second).toHaveLength(3)
    await expect(page.getByText("You're all caught up.")).toBeVisible()
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
  await expect(page.getByRole("link", { name: "Source 1" }).first()).toBeVisible()
  await expect(page.locator("#source-1")).toContainText("example.org/open-door/outcomes")
  await page.getByRole("link", { name: "About", exact: true }).click()
  await expect(page).toHaveURL(/tab=about/)
  await expect(page.getByText("EIN and staff email checked by imnet")).toBeVisible()
  await page.goto("/o/open-door-homes?tab=nonsense")
  await expect(page.getByRole("heading", { name: "Recent posts" })).toBeVisible()
})

test("F-003: unknown org is a 404", async ({ page }) => {
  const res = await page.goto("/o/does-not-exist")
  expect(res?.status()).toBe(404)
})

test("F-025: search finds orgs by name", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("searchbox", { name: "Search organizations" }).first().fill("river")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("link", { name: /Riverbend Readers/ })).toBeVisible()
})

test("F-002: Following requires sign-in", async ({ page }) => {
  await page.goto("/following")
  await expect(page).toHaveURL(/\/login$/)
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

test("F-054: Ways to help lists open needs across orgs, filters by cause, and appears on Home", async ({ page }) => {
  await page.goto("/needs")
  await expect(page.getByRole("heading", { name: "Ways to help" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Help with Saturday dinner crew" })).toBeVisible()
  await expect(page.getByText("Walk-in cooler repair")).toHaveCount(0) // met needs drop off

  await page.goto("/needs?cause=animals")
  await expect(page.getByRole("link", { name: "Help with Blankets and towels" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Help with Saturday dinner crew" })).toHaveCount(0)

  await page.goto("/")
  const side = page.getByRole("region", { name: "Ways to help" })
  await expect(side.getByRole("link", { name: /^Help with / })).toHaveCount(3)
  await side.getByRole("link", { name: "See all needs" }).click()
  await expect(page).toHaveURL(/\/needs$/)
})

test("F-058: events list soonest first with a cause filter; profiles and Home show upcoming events", async ({ page }) => {
  await page.goto("/events")
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible()
  const titles = await page.locator("main li p.font-semibold").allTextContents()
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
  for (const name of ["This moved me (sign in)", "Comment", "Share", "Save (sign in)"]) await expect(first.getByRole(name === "Comment" || name === "Share" ? "button" : "link", { name, exact: true })).toBeVisible()
  await first.getByRole("button", { name: "Comment", exact: true }).click()
  const inline = first.getByRole("region", { name: "Comments" })
  await expect(inline.getByRole("link", { name: "Sign in" })).toBeVisible()
  await expect(inline.locator("time").first()).toBeVisible()

  const [post] = await sql`select p.id from posts p where p.org_id = ${"00000000-0000-4000-a000-000000000001"}
    and exists (select 1 from comments c where c.post_id = p.id and c.as_org and c.parent_id is not null) limit 1`
  await page.goto(`/p/${post.id}`)
  const section = page.getByRole("region", { name: "Comments" })
  await expect(section.getByText("Author").first()).toBeVisible()
  // Top-level comments newest first.
  const tops = await section.locator(":scope > ul > li > div time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!))
  expect([...tops].sort().reverse()).toEqual(tops)
  // No counts anywhere.
  await expect(page.getByText(/\d+ (comments?|replies|reactions?|likes?)\b/)).toHaveCount(0)
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
