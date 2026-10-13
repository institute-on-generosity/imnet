import { expect, test } from "@playwright/test"
import "./helpers"


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
  await video.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.muted && v.currentTime > 0), { timeout: 10_000 }).toBe(true)
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

test("F-003 / F-024 / F-021: org profile tabs and footnoted impact stats", async ({ page }) => {
  await page.goto("/o/open-door-homes")
  await expect(page.getByRole("heading", { name: "Open Door Homes (Demo)" })).toBeVisible()
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
  await page.getByRole("searchbox", { name: "Search nonprofits" }).first().fill("river")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("link", { name: /Riverbend Readers/ })).toBeVisible()
})

test("F-002: Following requires sign-in", async ({ page }) => {
  await page.goto("/following")
  await expect(page).toHaveURL(/\/login$/)
})
