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
  const [profile] = await sql`select handle from profiles where id = ${userId}`
  expect(profile.handle).toMatch(/^[a-z0-9_]{3,30}$/)
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
  await page.locator('input[type="file"]').setInputFiles(SEED_PHOTO)
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
  const report = page.locator("section").filter({ hasText: `Report ${id}` })
  await expect(report.getByText("From the portfolio of")).toBeVisible()
  await expect(report.getByRole("link", { name: "Lakeshore Community Foundation (Demo)" }).first()).toBeVisible()
  // Harbor Table is followed directly, so its report has no portfolio line.
  const harbor = page.locator("section").filter({ hasText: "The new walk-in freezer is in." })
  await expect(harbor.getByText("From the portfolio of")).toHaveCount(0)
})

test("F-038: 'I give through this fund' shows what that giving became on the donor's profile", async () => {
  const [{ handle }] = await sql`select handle from profiles where id = ${userId}`
  await page.goto(`/u/${handle}`)
  await expect(page.getByRole("heading", { name: "What my giving became" })).toHaveCount(0)

  await page.goto("/o/lakeshore-community-foundation")
  await page.getByRole("button", { name: /I give through this fund: show on my profile/ }).click()
  await expect(page.getByRole("button", { name: /I give through this fund \(on your profile\)/ })).toBeVisible()
  await expect.poll(async () => (await sql`select bool_or(supporter) s from follows where user_id = ${userId}`)[0].s).toBe(true)

  await page.goto(`/u/${handle}`)
  await expect(page.getByRole("heading", { name: "What my giving became" })).toBeVisible()
  const fund = page.getByRole("region", { name: "Grants from Lakeshore Community Foundation (Demo)" })
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
  const call = page.locator("section").filter({ hasText: `Call ${id}` })
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

test("F-015: staff can't open another org's dashboard", async () => {
  const res = await page.goto(`/dashboard/${HARBOR}`)
  expect(res?.status()).toBe(404)
})

test("F-014: page views are logged", async () => {
  const [row] = await sql`select count(*)::int n from events where type = 'view'`
  expect(row.n).toBeGreaterThan(0)
})
