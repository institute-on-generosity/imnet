import { expect, type Page } from "@playwright/test"
import postgres from "postgres"

// Local Supabase defaults (npx supabase start).
export const sql = postgres(process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 1, idle_timeout: 5 }) // shared by all spec files; closes itself when idle
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324"

export const HARBOR = "00000000-0000-4000-a000-000000000001"
export const SEED_PHOTO = "supabase/seed-images/post-images/00000000-0000-4000-a000-000000000002/keys-at-door.jpg"

export const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

// Finds the magic link Supabase emailed to this address (local inbox).
async function magicLink(email: string) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()
      const link = (msg.HTML || msg.Text).match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)
      if (link) return link[0].replaceAll("&amp;", "&") as string
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No sign-in email for ${email}`)
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").fill(email)
  await page.getByRole("button", { name: "Email me a link" }).click()
  await expect(page.getByText("Check your email for a sign-in link.")).toBeVisible()
  await page.goto(await magicLink(email))
  await expect(page.getByRole("link", { name: "Me", exact: true })).toBeVisible()
  const [user] = await sql`select id from auth.users where email = ${email}`
  return user.id as string
}
