import { expect, test } from "@playwright/test"
import { HARBOR, SEED_PHOTO, signIn, sql, uniq } from "./helpers"

// One donor's journey: sign up, follow, react, claim an org, get approved, post with a photo.
test.describe.configure({ mode: "serial" })

const id = uniq()
const email = `dana.${id}@example.com`
const domain = `kitchen${id}.example.org`
const slug = `test-kitchen-${id}`
let userId = ""
const altText = `Volunteers setting tables for dinner ${id}`

test("F-007: magic-link sign-in creates a profile", async ({ page }) => {
  userId = await signIn(page, email)
  const [profile] = await sql`select handle from profiles where id = ${userId}`
  expect(profile.handle).toMatch(/^[a-z0-9_]{3,30}$/)
})

test("F-012 / F-002: follow an org; Following shows only its posts", async ({ page }) => {
  await signIn(page, email)
  await page.goto("/o/harbor-table")
  await page.locator("main").getByRole("button", { name: "Follow" }).first().click()
  await expect(page.locator("main").getByRole("button", { name: "Following" }).first()).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from follows where user_id = ${userId}`)[0].n).toBe(1)

  await page.goto("/following")
  await expect(page.getByText("212 households")).toBeVisible()
  await expect(page.getByText("Okafor family")).toHaveCount(0)
})

test("F-013: 'Moved me' is saved privately, with no public count", async ({ page }) => {
  await signIn(page, email)
  const [post] = await sql`select id from posts where org_id = ${HARBOR} order by created_at desc limit 1`
  await page.goto(`/p/${post.id}`)
  await page.getByRole("button", { name: "Moved me" }).click()
  await expect(page.getByRole("button", { name: "Moved you" })).toBeVisible()
  await expect.poll(async () => (await sql`select count(*)::int n from moved where user_id = ${userId}`)[0].n).toBe(1)
  await expect(page.locator("main")).not.toContainText(/\d+ (people|moved)/i)
})

test("F-008 / B-008: claim checks the work email and keeps what you typed", async ({ page }) => {
  await signIn(page, email)
  await page.goto("/dashboard")
  await page.getByLabel("Organization name").fill("Test Kitchen Collective")
  await page.getByLabel("EIN").fill(`9${id.slice(-1)}-${id.slice(-7)}`)
  await page.getByLabel("Website").fill(`https://${domain}`)
  await page.getByLabel(/work email/).fill("dana@example.com")
  await page.getByRole("button", { name: "Submit claim" }).click()
  await expect(page.getByText(`Use an email on ${domain}`)).toBeVisible()
  await expect(page.getByLabel("Organization name")).toHaveValue("Test Kitchen Collective")

  await page.getByLabel(/work email/).fill(`dana@${domain}`)
  await page.getByRole("button", { name: "Submit claim" }).click()
  await expect(page.getByText("Claim submitted.")).toBeVisible()
  const [claim] = await sql`select status from org_claims where user_id = ${userId}`
  expect(claim.status).toBe("pending")
})

test("F-009 / F-017: an admin approves the claim", async ({ page }) => {
  await sql`update profiles set is_admin = true where id = ${userId}`
  await signIn(page, email)
  await page.goto("/admin")
  const card = page.locator("main section > div, main [data-slot=card]").filter({ hasText: "Test Kitchen Collective" }).first()
  await card.getByPlaceholder("profile-slug").fill(slug)
  await card.getByRole("button", { name: "Approve" }).click()
  await expect.poll(async () => (await sql`select status from orgs where slug = ${slug}`)[0]?.status).toBe("verified")
  const [member] = await sql`select count(*)::int n from org_members m join orgs o on o.id = m.org_id where o.slug = ${slug} and m.user_id = ${userId}`
  expect(member.n).toBe(1)
})

test("F-028 / F-010: staff post with a photo (description and consent required) and a video link", async ({ page }) => {
  await signIn(page, email)
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

test("F-015: staff can't open another org's dashboard", async ({ page }) => {
  await signIn(page, email)
  const res = await page.goto(`/dashboard/${HARBOR}`)
  expect(res?.status()).toBe(404)
})

test("F-014: page views are logged", async () => {
  const [row] = await sql`select count(*)::int n from events where type = 'view'`
  expect(row.n).toBeGreaterThan(0)
})
