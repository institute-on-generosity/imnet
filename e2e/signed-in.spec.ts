import { expect, test, type Page } from "@playwright/test"
import { HARBOR, SEED_PHOTO, signIn, sql, uniq } from "./helpers"

// One donor's journey: sign up, follow, react, claim an org, get approved, post with a photo.
test.describe.configure({ mode: "serial" })

const id = uniq()
const email = `dana.${id}@example.com`
const domain = `kitchen${id}.example.org`
const slug = `test-kitchen-${id}`
const orgName = `Test Kitchen ${id}`
let userId = ""
// One signed-in page for the whole journey: sign in once, like a real visit.
let page: Page

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext()).newPage()
})

// Leave the local database as we found it: remove this run's org, posts, grants and user.
test.afterAll(async () => {
  await sql`delete from posts where body like ${`%${id}%`}`
  await sql`delete from orgs where slug = ${slug}`
  await sql`delete from org_claims where org_name = ${orgName}`
  if (userId) await sql`delete from auth.users where id = ${userId}`
})
const altText = `Volunteers setting tables for dinner ${id}`

test("F-007: magic-link sign-in creates a profile", async () => {
  userId = await signIn(page, email)
  const [profile] = await sql`select handle, avatar_url from profiles where id = ${userId}`
  expect(profile.handle).toMatch(/^[a-z0-9_]{3,30}$/)
  // F-071: new sign-ups get an illustrated avatar, shown on their profile card.
  expect(profile.avatar_url).toMatch(/^\/avatars\/u[0-9a-f]{16}$/)
  await page.goto("/")
  await expect(page.locator(`img[src="${profile.avatar_url}"]`).first()).toBeVisible()
})

test("F-012 / F-002: follow an org; Following shows only its posts", async () => {
  await page.goto("/o/harbor-table")
  await page.locator("main").getByRole("button", { name: "Follow" }).first().click()
  await expect(page.locator("main").getByRole("button", { name: "Following" }).first()).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from follows where user_id = ${userId}`)[0].n).toBe(1)

  await page.goto("/following")
  await expect(page.getByText("212 households")).toBeVisible()
  await expect(page.getByText("Okafor family")).toHaveCount(0)
})

test("F-013: 'Moved me' is saved privately, with no public count", async () => {
  const [post] = await sql`select id from posts where org_id = ${HARBOR} order by created_at desc limit 1`
  await page.goto(`/p/${post.id}`)
  await page.getByRole("button", { name: "Moved me" }).click()
  await expect(page.getByRole("button", { name: "Moved you" })).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from moved where user_id = ${userId}`)[0].n).toBe(1)
  await expect(page.locator("main")).not.toContainText(/\d+ (people|moved)/i)
})

test("F-008 / B-008: claim checks the work email and keeps what you typed", async () => {
  await page.goto("/dashboard")
  await page.getByLabel("Organization name").fill(orgName)
  await page.getByLabel("EIN").fill(`9${id.slice(-1)}-${id.slice(-7)}`)
  await page.getByLabel("Website").fill(`https://${domain}`)
  await page.getByLabel(/work email/).fill("dana@example.com")
  await page.getByRole("button", { name: "Submit claim" }).click()
  await expect(page.getByText(`Use an email on ${domain}`)).toBeVisible()
  await expect(page.getByLabel("Organization name")).toHaveValue(orgName)

  await page.getByLabel(/work email/).fill(`dana@${domain}`)
  await page.getByRole("button", { name: "Submit claim" }).click()
  await expect(page.getByText("Claim submitted.")).toBeVisible()
  const [claim] = await sql`select status from org_claims where user_id = ${userId}`
  expect(claim.status).toBe("pending")
})

test("F-009 / F-017: an admin approves the claim", async () => {
  await sql`update profiles set is_admin = true where id = ${userId}`
  await page.goto("/admin")
  const card = page.locator("main section > div, main [data-slot=card]").filter({ hasText: orgName }).first()
  await card.getByPlaceholder("profile-slug").fill(slug)
  await card.getByRole("button", { name: "Approve" }).click()
  await expect.poll(async () => (await sql`select status from orgs where slug = ${slug}`)[0]?.status).toBe("verified")
  const [member] = await sql`select count(*)::int n from org_members m join orgs o on o.id = m.org_id where o.slug = ${slug} and m.user_id = ${userId}`
  expect(member.n).toBe(1)
})

test("F-028 / F-010: staff post with a photo (description and consent required) and a video link", async () => {
  const [org] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${org.id}`)
  await page.getByLabel("What happened?").fill("Our first community dinner served 60 neighbors tonight.")
  await page.getByLabel(/Video link/).fill("https://youtu.be/dQw4w9WgXcQ")
  await page.locator('label:has-text("Add photos") input[type="file"]').setInputFiles(SEED_PHOTO)
  const alt = page.getByLabel("Description for photo 1")
  await expect(alt).toBeVisible()

  await page.getByRole("button", { name: "Post", exact: true }).click()
  expect(await alt.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true)

  await alt.fill(altText)
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(page.getByText("Confirm consent before posting photos.")).toBeVisible()
  await expect(alt).toHaveValue(altText)

  await page.getByLabel(/given consent/).check()
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(page.getByText("Posted.")).toBeVisible()

  const [post] = await sql`select embed_url, image_paths, image_alts from posts where org_id = ${org.id}`
  expect(post.embed_url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")
  expect(post.image_paths[0]).toMatch(new RegExp(`^${org.id}/`))
  expect(post.image_alts).toEqual([altText])

  await page.goto("/")
  await expect(page.getByAltText(altText)).toBeVisible()
})

test("F-034: a foundation tags a grantee; it stays private until the nonprofit confirms", async () => {
  // Make this user staff of the demo foundation too (they already run the Test Kitchen nonprofit).
  const FOUNDATION = "00000000-0000-4000-a000-000000000005"
  await sql`insert into org_members (org_id, user_id) values (${FOUNDATION}, ${userId}) on conflict do nothing`
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`

  await page.goto(`/dashboard/${FOUNDATION}`)
  await page.getByLabel("What happened?").fill(`Welcome to our newest grantee, Test Kitchen ${id}.`)
  await page.getByLabel("Search nonprofits to tag as grantees").fill(orgName)
  await page.getByRole("button", { name: orgName }).click()
  await page.getByLabel(`Grant amount for ${orgName}`).fill("7,500")
  await page.getByLabel(`Grant purpose for ${orgName}`).fill("Community dinner supplies")
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(page.getByText("Posted. Grants show once each nonprofit confirms them.")).toBeVisible()

  const [grant] = await sql`select id, amount_usd, confirmed_at from grants where grantee_id = ${kitchen.id}`
  expect(grant.amount_usd).toBe(7500)
  expect(grant.confirmed_at).toBeNull()

  // Signed-out visitors don't see the unconfirmed grant.
  const anon = await page.context().browser()!.newPage()
  await anon.goto(`/o/${slug}`)
  await expect(anon.getByRole("heading", { name: "Funded by" })).toHaveCount(0)

  // The nonprofit confirms it from its dashboard.
  await page.goto(`/dashboard/${kitchen.id}`)
  await expect(page.getByRole("heading", { name: "Grants to confirm" })).toBeVisible()
  await page.getByRole("button", { name: "Confirm" }).click()
  await expect.poll(async () => (await sql`select confirmed_at from grants where id = ${grant.id}`)[0].confirmed_at).not.toBeNull()

  await anon.goto(`/o/${slug}`)
  await expect(anon.getByRole("heading", { name: "Funded by" })).toBeVisible()
  await anon.goto(`/o/${slug}?tab=about`)
  await expect(anon.getByText("$7,500, Community dinner supplies")).toBeVisible()
  await anon.close()
})

test("F-036: the dashboard nudges a report on the confirmed grant; the report reaches the foundation", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await expect(page.getByRole("heading", { name: "Share how your grants are going" })).toBeVisible()
  await page.getByRole("link", { name: "Write a report" }).click()
  await expect(page).toHaveURL(/report=/)
  await expect(page.getByLabel("This post reports on a grant (optional)")).toHaveValue(/[0-9a-f-]{36}/)

  await page.getByLabel("What happened?").fill(`Dinner supplies arrived: we served 90 neighbors this week. Report ${id}.`)
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(page.getByText("Posted.")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Share how your grants are going" })).toHaveCount(0)

  await page.goto("/o/lakeshore-community-foundation")
  await expect(page.getByRole("link", { name: new RegExp(`Latest report: Dinner supplies arrived.*Report ${id}`) })).toBeVisible()
})

test("F-037: following a foundation brings its grantees' reports into Following, with context", async () => {
  const FOUNDATION = "00000000-0000-4000-a000-000000000005"
  await page.goto("/o/lakeshore-community-foundation")
  await page.locator("main").getByRole("button", { name: "Follow" }).first().click()
  await expect(page.locator("main").getByRole("button", { name: "Following" }).first()).toBeVisible()
  // The button updates optimistically; wait for the follow to be saved before navigating.
  await expect.poll(async () => (await sql`select count(*)::int n from follows where user_id = ${userId} and org_id = ${FOUNDATION}`)[0].n).toBe(1)

  await page.goto("/following")
  // This user doesn't follow their own Test Kitchen org, so its report appears via Lakeshore's portfolio.
  const report = page.locator("article").filter({ hasText: `Report ${id}` })
  await expect(report.getByText("From the portfolio of")).toBeVisible()
  await expect(report.getByRole("link", { name: "Lakeshore Community Foundation" }).first()).toBeVisible()
  // Harbor Table is followed directly, so its report has no portfolio line.
  const harbor = page.locator("article").filter({ hasText: "The new walk-in freezer is in." })
  await expect(harbor.getByText("From the portfolio of")).toHaveCount(0)
})

test("F-038: 'I give through this fund' shows what that giving became on the donor's profile", async () => {
  const [{ handle }] = await sql`select handle from profiles where id = ${userId}`
  await page.goto(`/u/${handle}`)
  await expect(page.getByRole("heading", { name: "What my giving became" })).toHaveCount(0)

  await page.goto("/o/lakeshore-community-foundation")
  await page.getByRole("button", { name: /Show "I give through this fund" on my profile/ }).click()
  await expect(page.getByRole("button", { name: /"I give through this fund" shown on your profile/ })).toBeVisible()
  await expect.poll(async () => (await sql`select bool_or(supporter) s from follows where user_id = ${userId}`)[0].s).toBe(true)

  await page.goto(`/u/${handle}`)
  await expect(page.getByRole("heading", { name: "What my giving became" })).toBeVisible()
  const fund = page.getByRole("region", { name: "Grants from Lakeshore Community Foundation" })
  await expect(fund.getByRole("link", { name: /Latest report: The new walk-in freezer is in/ })).toBeVisible()

  // Visitors see it too, worded for someone else.
  const anon = await page.context().browser()!.newPage()
  await anon.goto(`/u/${handle}`)
  await expect(anon.getByRole("heading", { name: "What their giving became" })).toBeVisible()
  await anon.close()
})

test("F-039: a foundation posts an open call; matching nonprofits see it on their dashboard", async () => {
  const FOUNDATION = "00000000-0000-4000-a000-000000000005"
  await page.goto(`/dashboard/${FOUNDATION}`)
  await page.getByLabel("Type").selectOption("open_call")
  await page.getByLabel("What happened?").fill(`Kitchen equipment grants for neighborhood meal programs. Call ${id}.`)
  const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel("Apply by").fill(deadline)
  await page.getByLabel("Maximum award (optional)").fill("12,000")
  await page.getByLabel("Application link").fill("https://example.org/lakeshore/kitchens")
  await page.locator('input[name="call_causes"][value="hunger"]').check()
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(page.getByText("Posted.")).toBeVisible()

  await page.goto("/calls?cause=hunger")
  const call = page.locator("article").filter({ hasText: `Call ${id}` })
  await expect(call.getByText("Up to $12,000")).toBeVisible()

  // A hunger nonprofit sees it in "Open calls for your causes".
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await sql`insert into org_causes (org_id, cause_slug) values (${kitchen.id}, 'hunger') on conflict do nothing`
  await page.goto(`/dashboard/${kitchen.id}`)
  await expect(page.getByRole("heading", { name: "Open calls for your causes" })).toBeVisible()
  await expect(page.getByText(`Call ${id}`)).toBeVisible()
})

test("B-013: a follow is saved even if you leave the page right after clicking", async () => {
  const [org] = await sql`select id from orgs where slug = 'riverbend-readers'`
  await page.goto("/o/riverbend-readers")
  await page.locator("main").getByRole("button", { name: "Follow" }).first().click()
  // Leave immediately, with no wait for the save (this used to lose the follow).
  await page.goto("/calls")
  await expect.poll(async () => (await sql`select count(*)::int n from follows where user_id = ${userId} and org_id = ${org.id}`)[0].n).toBe(1)

  // Same for "Moved me".
  const [post] = await sql`select id from posts where org_id = ${org.id} order by created_at desc limit 1`
  await page.goto(`/p/${post.id}`)
  await page.getByRole("button", { name: "Moved me" }).click()
  await page.goto("/calls")
  await expect.poll(async () => (await sql`select count(*)::int n from moved where user_id = ${userId} and post_id = ${post.id}`)[0].n).toBe(1)
})

test("F-043: staff add a sourced impact figure; it shows footnoted on the profile; they can remove it", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByLabel("Figure").fill("120")
  await page.getByLabel("What it counts").fill("Dinners served")
  await page.getByLabel("Source link (required)").fill("https://example.org/kitchen/log")
  await page.getByRole("button", { name: "Add figure" }).click()
  await expect(page.getByRole("button", { name: 'Remove "Dinners served"' })).toBeVisible()

  await page.goto(`/o/${slug}`)
  await expect(page.getByRole("region", { name: "Impact so far" }).getByText("Dinners served")).toBeVisible()
  await page.goto(`/o/${slug}?tab=about`)
  await expect(page.locator("#source-1")).toContainText("example.org/kitchen/log")

  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByRole("button", { name: 'Remove "Dinners served"' }).click()
  await expect(page.getByRole("button", { name: 'Remove "Dinners served"' })).toHaveCount(0)
})

test("F-044: staff edit a post (marked Edited) and delete one", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${kitchen.id}`)
  const row = page.locator("li").filter({ hasText: "first community dinner" })
  await row.getByRole("button", { name: "Edit text" }).click()
  await page.getByLabel("Post text").fill(`Our first community dinner served 64 neighbors tonight (count corrected). ${id}`)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByLabel("Post text")).toHaveCount(0)

  const [post] = await sql`select id, edited_at from posts where org_id = ${kitchen.id} and body like '%count corrected%'`
  expect(post.edited_at).not.toBeNull()
  await page.goto(`/p/${post.id}`)
  await expect(page.getByText("count corrected")).toBeVisible()
  await expect(page.getByText("Edited", { exact: true })).toBeVisible()

  await page.goto(`/dashboard/${kitchen.id}`)
  page.once("dialog", (d) => d.accept())
  await page.locator("li").filter({ hasText: "count corrected" }).getByRole("button", { name: "Delete post" }).click()
  await expect.poll(async () => (await sql`select count(*)::int n from posts where id = ${post.id}`)[0].n).toBe(0)
})

test("F-045: staff upload a logo; it replaces the monogram and points only at our storage", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.locator('label:has-text("Upload logo") input[type="file"]').setInputFiles(SEED_PHOTO)
  await expect(page.getByText("Change logo")).toBeVisible()
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved.")).toBeVisible()

  const [org] = await sql`select logo_url from orgs where id = ${kitchen.id}`
  expect(org.logo_url).toMatch(new RegExp(`^${kitchen.id}/logo-[0-9a-f-]{36}\\.jpg$`))
  await page.goto(`/o/${slug}`)
  await expect(page.locator(`main img[src$="/post-images/${org.logo_url}"]`).first()).toBeVisible()
})

test("F-046: save a post with the bookmark; it's on /saved; unsave removes it", async () => {
  await page.goto("/o/greenway-stewards")
  const post = page.locator("article").filter({ hasText: "re-cut two miles of eroded trail" }).first()
  await post.getByRole("button", { name: "Save", exact: true }).click()
  await expect(post.getByRole("button", { name: /Saved \(private\)/ })).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from saved_posts where user_id = ${userId}`)[0].n).toBe(1)

  await page.goto("/saved")
  await expect(page.getByText("re-cut two miles of eroded trail")).toBeVisible()
  await page.getByRole("button", { name: /Saved \(private\)/ }).click()
  await expect.poll(async () => (await sql`select count(*)::int n from saved_posts where user_id = ${userId}`)[0].n).toBe(0)
  await page.reload()
  await expect(page.getByText("Nothing saved yet.")).toBeVisible()
})

test("F-048 / B-015: invite a colleague by link; they sign in, come back to the invite, and join", async ({ browser }) => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  const colleague = `sam.${id}@${domain}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByLabel("Colleague's email").fill(colleague)
  await page.getByRole("button", { name: "Invite" }).click()
  await expect(page.getByText("Invite created.")).toBeVisible()
  const link = await page.locator("[data-invite-link]").getAttribute("data-invite-link")

  // The colleague, in their own browser, opens the link signed out.
  const other = await (await browser.newContext()).newPage()
  await other.goto(link!)
  await expect(other.getByRole("heading", { name: `Join ${orgName}` })).toBeVisible()
  await other.getByRole("link", { name: "Sign in to join" }).click()
  await expect(other).toHaveURL(/\/login\?next=/)
  await signIn(other, colleague)
  await expect(other).toHaveURL(new RegExp(`/invite/`))
  await other.getByRole("button", { name: `Join ${orgName}` }).click()
  await expect(other).toHaveURL(new RegExp(`/dashboard/${kitchen.id}`))
  await other.close()

  await page.reload()
  const row = page.locator("li").filter({ hasText: colleague.split("@")[0].replace(".", "") })
  await expect(row).toHaveCount(1)
  await row.getByRole("button", { name: /Remove @/ }).click()
  await expect(row).toHaveCount(0)
  await sql`delete from auth.users where email = ${colleague}`

  // A crafted sign-in link can't send anyone off-site.
  await page.goto("/login?next=//evil.example")
  expect(await page.locator('input[name="next"]').inputValue()).toBe("/")
})

test("F-049: the bell shows a quiet dot for new items; opening the inbox clears it", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  // Start from "inbox read a minute ago" (deterministic; dev mode runs effects twice, which races).
  await sql`update profiles set notifications_seen_at = now() - interval '1 minute' where id = ${userId}`

  const RIVERSIDE = "00000000-0000-4000-a000-000000000006"
  const [grant] = await sql`insert into grants (foundation_id, grantee_id, amount_usd, purpose) values (${RIVERSIDE}, ${kitchen.id}, 3000, 'Stoves') returning id`
  try {
    await page.goto("/")
    const bell = page.getByRole("link", { name: /Notifications/ })
    await expect(bell).toContainText("(new)")
    await expect(bell).not.toContainText(/\d/) // a dot, never a number

    await bell.click()
    await expect(page.getByText("Riverside Family Foundation recorded a $3,000 grant to you.")).toBeVisible()
    await expect.poll(async () => {
      await page.goto("/")
      return page.getByRole("link", { name: /Notifications/ }).innerText()
    }).not.toContain("(new)")
  } finally {
    await sql`delete from grants where id = ${grant.id}`
  }
})

test("F-051: staff post a need with a way to help; it shows on the profile; marking it met says so", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  const need = `Soup pots ${id}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByLabel("Kind").selectOption("item")
  await page.getByLabel("What you need").fill(need)
  await page.getByLabel("How to help: link or email").fill(`pots@${domain}`)
  await page.getByRole("button", { name: "Add need" }).click()
  await expect(page.getByRole("button", { name: `Mark "${need}" met` })).toBeVisible()

  await page.goto(`/o/${slug}`)
  const panel = page.getByRole("region", { name: "Current needs" })
  await expect(panel.getByRole("link", { name: `Help with ${need}` })).toHaveAttribute("href", `mailto:pots@${domain}`)

  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByRole("button", { name: `Mark "${need}" met` }).click()
  await expect(page.getByRole("button", { name: `Reopen "${need}"` })).toBeVisible()
  await page.goto(`/o/${slug}`)
  await expect(panel.getByText(/Met .*Thank you\./)).toBeVisible()
  await expect(panel.getByRole("link", { name: `Help with ${need}` })).toHaveCount(0)
})

test("F-053: a donor thanks an org privately; its staff see the note and can remove it", async () => {
  await page.goto("/o/harbor-table")
  await page.getByRole("button", { name: "Send a thank-you note" }).click()
  await page.getByLabel("Thank Harbor Table's team").fill(`Thank you for the dinners ${id}`)
  await page.getByRole("button", { name: "Send note" }).click()
  await expect(page.getByText("Sent. Only their team will see it.")).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from thanks where user_id = ${userId}`)[0].n).toBe(1)

  // A note to this user's own org, from a demo donor, appears on its dashboard.
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await sql`insert into thanks (org_id, user_id, body) values (${kitchen.id}, '00000000-0000-4000-c000-000000000000', ${`You fed my family ${id}`})`
  await page.goto(`/dashboard/${kitchen.id}`)
  const note = page.getByRole("listitem").filter({ hasText: `You fed my family ${id}` })
  await expect(note).toBeVisible()
  await note.getByRole("button", { name: "Remove note" }).click()
  await expect(note).toHaveCount(0)
})

test("F-052: log a gift in the private giving journal; totals by year; nobody else can open it", async () => {
  await page.goto("/giving")
  await page.getByLabel("Organization", { exact: true }).selectOption({ label: "Harbor Table" })
  await page.getByLabel("Amount ($)").fill("75")
  await page.getByLabel("Note (optional)").fill(`Gift ${id}`)
  await page.getByRole("button", { name: "Log gift" }).click()
  const year = new Date().toISOString().slice(0, 4)
  const panel = page.getByRole("region", { name: year })
  await expect(panel.getByText(`Gift ${id}`)).toBeVisible()
  await expect(panel.getByText("$75").first()).toBeVisible()

  const anon = await page.context().browser()!.newPage()
  await anon.goto("/giving")
  await expect(anon).toHaveURL(/\/login/)
  await anon.close()
})

test("F-055: after Donate, a quiet link logs the gift with the org preselected", async () => {
  const [kitchen] = await sql`update orgs set everyorg_slug = ${`imnet-e2e-${id}`} where slug = ${slug} returning id`
  await page.context().route("https://www.every.org/**", (r) => r.abort())
  await page.goto(`/o/${slug}`)
  const popup = page.waitForEvent("popup")
  await page.getByRole("link", { name: "Donate" }).click()
  await (await popup).close()
  await page.getByRole("link", { name: "Gave? Log it" }).click()
  await expect(page).toHaveURL(/\/giving\?org=/)
  await expect(page.getByLabel("Organization", { exact: true })).toHaveValue(kitchen.id)
})

test("F-056: a foundation sees its confirmed grants with no report yet", async () => {
  const FOUNDATION = "00000000-0000-4000-a000-000000000005"
  await page.goto(`/dashboard/${FOUNDATION}`)
  const card = page.locator("[data-slot=card]").filter({ has: page.getByText("Reports not yet posted") })
  await expect(card.getByRole("link", { name: "Bridge Welcome Center" })).toBeVisible()
  await expect(card.getByText(/Awarded \d+ months? ago|Awarded this month/).first()).toBeVisible()
  // Kennel heaters already has a report, so Second Chance Paws isn't listed.
  await expect(card.getByRole("link", { name: "Second Chance Paws" })).toHaveCount(0)
})

test("F-058: staff add an event; a donor RSVPs privately; staff see who's going", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  const title = `Soup night ${id}`
  const when = new Date(Date.now() + 5 * 86_400_000)
  const local = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}T18:30`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByLabel("Event", { exact: true }).fill(title)
  await page.getByLabel("Starts").fill(local)
  await page.getByLabel("Where").fill("Test Kitchen hall")
  await page.getByRole("button", { name: "Add event" }).click()
  await expect(page.getByRole("button", { name: `Remove "${title}"` })).toBeVisible()

  await page.goto(`/o/${slug}`)
  const row = page.getByRole("region", { name: "Upcoming events" }).getByRole("listitem").filter({ hasText: title })
  await expect(row.getByText("6:30 PM")).toBeVisible()
  await row.getByRole("button", { name: `Going? to ${title}` }).click()
  await expect(row.getByRole("button", { name: `Going to ${title}` })).toHaveAttribute("aria-pressed", "true")
  await expect.poll(async () => (await sql`select count(*)::int n from event_rsvps r join org_events e on e.id = r.event_id where e.title = ${title}`)[0].n).toBe(1)

  await page.goto(`/dashboard/${kitchen.id}`)
  await expect(page.getByText("1 going")).toBeVisible()
})

test("F-059: 'I'm interested' on a volunteer need tells only the org's team", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  const need = `Dish crew ${id}`
  await sql`insert into org_needs (org_id, kind, title, help_url) values (${kitchen.id}, 'volunteer', ${need}, 'https://example.org/dish')`
  await page.goto(`/o/${slug}`)
  await page.getByRole("button", { name: `I'm interested in ${need}` }).click()
  await expect(page.getByRole("button", { name: `Interested in ${need}` })).toHaveAttribute("aria-pressed", "true")
  await expect.poll(async () => (await sql`select count(*)::int n from need_interest i join org_needs n on n.id = i.need_id where n.title = ${need}`)[0].n).toBe(1)
  await page.goto(`/dashboard/${kitchen.id}`)
  await expect(page.getByText("1 interested")).toBeVisible()
})

test("F-060: the giving journal shows news from orgs you gave to, since your gift", async () => {
  await sql`insert into gifts (user_id, org_id, amount_usd, given_on) values (${userId}, ${HARBOR}, 40, current_date - 30)`
  await page.goto("/giving")
  const since = page.getByRole("region", { name: "Since your gifts" })
  await expect(since.getByRole("link", { name: /Harbor Table/ }).first()).toBeVisible()
})

test("F-062 / F-063: comment, reply and delete; staff comment as the org and hear about comments and replies", async () => {
  const [harborPost] = await sql`select id from posts where org_id = ${HARBOR} order by created_at desc limit 1`
  await page.goto(`/p/${harborPost.id}`)
  const section = page.getByRole("region", { name: "Comments" })
  await expect(section.getByText(/Commenting as/)).toHaveCount(0) // not Harbor's staff
  await section.getByLabel("Add a comment").fill(`So glad to read this ${id}`)
  await section.getByRole("button", { name: "Post", exact: true }).click()
  const mine = section.locator("li").filter({ hasText: `So glad to read this ${id}` }).first()
  await expect(mine).toBeVisible()

  // Reply under my own comment, then a demo donor replies to me: I get notified.
  await mine.getByRole("button", { name: "Reply", exact: true }).first().click()
  await section.getByLabel("Add a reply").fill(`Adding to that ${id}`)
  await mine.getByRole("button", { name: "Reply", exact: true }).last().click() // the reply box's submit
  await expect(mine.getByText(`Adding to that ${id}`)).toBeVisible()
  const [top] = await sql`select id from comments where body = ${`So glad to read this ${id}`}`
  await sql`insert into comments (post_id, parent_id, user_id, body) values (${harborPost.id}, ${top.id}, '00000000-0000-4000-c000-000000000002', ${`Agreed ${id}`})`
  await page.goto("/notifications")
  await expect(page.getByRole("link", { name: /replied to your comment/ }).first()).toBeVisible()

  await page.goto(`/p/${harborPost.id}`)
  await section.locator("li").filter({ hasText: `So glad to read this ${id}` }).first().getByRole("button", { name: "Delete comment" }).first().click()
  await expect(section.getByText(`So glad to read this ${id}`)).toHaveCount(0)
  await expect(section.getByText(`Agreed ${id}`)).toHaveCount(0) // replies go with it

  // A demo donor comments on this user's own org post; the team hears about it and replies as the org.
  const [own] = await sql`select p.id from posts p join orgs o on o.id = p.org_id where o.slug = ${slug} order by p.created_at desc limit 1`
  await sql`insert into comments (post_id, user_id, body) values (${own.id}, '00000000-0000-4000-c000-000000000001', ${`Thank you for this ${id}`})`
  await page.goto("/notifications")
  await page.getByRole("link", { name: /commented on your post/ }).first().click()
  await expect(page).toHaveURL(new RegExp(`/p/${own.id}#comments`))
  await section.getByRole("button", { name: new RegExp(`Switch to ${orgName}`) }).click()
  await expect(section.getByText(`Commenting as ${orgName}`).first()).toBeVisible()
  await section.getByLabel("Add a comment").fill(`Thanks for being here ${id}`)
  await section.getByRole("button", { name: "Post", exact: true }).click()
  const reply = section.locator("li").filter({ hasText: `Thanks for being here ${id}` }).first()
  await expect(reply.getByText("Author")).toBeVisible()
  await expect(reply.getByRole("link", { name: orgName })).toBeVisible()
})

test("F-065: a donor who logged a gift sees a hint, opts in from the journal, and their comment shows Donor", async () => {
  const [harborPost] = await sql`select id from posts where org_id = ${HARBOR} order by created_at desc limit 1`
  await sql`update profiles set donor_badge = false where id = ${userId}`
  await page.goto(`/p/${harborPost.id}`)
  const section = page.getByRole("region", { name: "Comments" })
  await section.getByRole("link", { name: "Show a Donor badge on your comments" }).click()
  await expect(page).toHaveURL(/\/giving#donor-badge/)
  await page.getByLabel(/Show a Donor badge on my comments/).check()
  await expect.poll(async () => (await sql`select donor_badge from profiles where id = ${userId}`)[0].donor_badge).toBe(true)

  await page.goto(`/p/${harborPost.id}`)
  await expect(section.getByRole("link", { name: "Show a Donor badge on your comments" })).toHaveCount(0)
  await section.getByLabel("Add a comment").fill(`Proud donor here ${id}`)
  await section.getByRole("button", { name: "Post", exact: true }).click()
  const mine = section.locator("li").filter({ hasText: `Proud donor here ${id}` }).first()
  await expect(mine.getByTitle("Has given to Harbor Table (self-reported)")).toBeVisible()
})

test("F-067 / B-022: staff see 30-day charts and top posts; totals match the database", async () => {
  const FOUNDATION = "00000000-0000-4000-a000-000000000005"
  await page.goto(`/dashboard/${FOUNDATION}`)
  await expect(page.getByRole("img", { name: /Views per day/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Most viewed posts" })).toBeVisible()
  const [{ n }] = await sql`select count(*)::int n from events where org_id = ${FOUNDATION} and type = 'view'
    and created_at >= (((now() at time zone 'UTC')::date - 29)::timestamp at time zone 'UTC')`
  await expect(page.locator("figure").filter({ hasText: "Views" }).first()).toContainText(n.toLocaleString("en-US"))
})

test("F-073: edit your profile: headline, location, About, causes and a cover from the set", async () => {
  const [{ handle }] = await sql`select handle from profiles where id = ${userId}`
  await page.goto(`/u/${handle}`)
  await page.getByRole("link", { name: "Edit profile" }).click()
  await expect(page).toHaveURL(/\/settings\/profile/)
  await page.getByLabel("Headline").fill(`Weekend volunteer ${id}`)
  await page.getByLabel("Location").fill("Tacoma, WA")
  await page.getByLabel("About").fill(`I give where I live. ${id}`)
  await page.getByRole("radio", { name: "Lavender field" }).click()
  await page.locator("label", { hasText: "Animals" }).click()
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page).toHaveURL(new RegExp(`/u/${handle}$`))
  await expect(page.getByText(`Weekend volunteer ${id}`)).toBeVisible()
  await expect(page.getByText("Tacoma, WA")).toBeVisible()
  await expect(page.getByText(`I give where I live. ${id}`)).toBeVisible()
  await expect(page.locator('main img[src$="covers/lavender.webp"]')).toBeVisible()
  await expect(page.getByRole("list", { name: "Causes I care about" }).getByRole("link", { name: "Animals" })).toBeVisible()
})

test("F-073: staff add location, founding year, team and programs; they show on the profile", async () => {
  const [kitchen] = await sql`select id from orgs where slug = ${slug}`
  await page.goto(`/dashboard/${kitchen.id}`)
  await page.getByLabel("Location").fill("Springfield, IL")
  await page.getByLabel("Founded").fill("2019")
  await page.getByLabel("Team").fill("2 staff · 40 volunteers")
  await page.getByLabel("Programs (comma separated, up to 8)").fill("Soup night, Pantry")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved.")).toBeVisible()
  await page.goto(`/o/${slug}?tab=about`)
  await expect(page.getByText("Springfield, IL").first()).toBeVisible()
  await expect(page.getByText("2 staff · 40 volunteers").first()).toBeVisible()
  await expect(page.getByRole("listitem").filter({ hasText: "Soup night" })).toBeVisible()
})

test("F-015: staff can't open another org's dashboard", async () => {
  const res = await page.goto(`/dashboard/${HARBOR}`)
  expect(res?.status()).toBe(404)
})

test("F-014: page views are logged", async () => {
  const [row] = await sql`select count(*)::int n from events where type = 'view'`
  expect(row.n).toBeGreaterThan(0)
})
