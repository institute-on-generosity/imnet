// Deletes post photos that were uploaded but never posted (older than a day).
// Ops script, not app code: it uses the Supabase secret key, which the web app never holds.
//
//   npm run cleanup:uploads              # delete
//   npm run cleanup:uploads -- --dry-run # list only
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (see .env.example).")
  process.exit(1)
}
const dryRun = process.argv.includes("--dry-run")
const supabase = createClient(url, secret, { auth: { persistSession: false } })

const { data, error } = await supabase.rpc("orphan_post_images")
if (error) {
  console.error(`Couldn't list orphaned photos: ${error.message}`)
  process.exit(1)
}
const names = (data as { name: string }[]).map((r) => r.name)
console.log(`${names.length} orphaned photo${names.length === 1 ? "" : "s"}${dryRun ? " (dry run, nothing deleted)" : ""}`)
for (const name of names) console.log(`  ${name}`)

if (!dryRun) {
  for (let i = 0; i < names.length; i += 100) {
    const { error: rmError } = await supabase.storage.from("post-images").remove(names.slice(i, i + 100))
    if (rmError) {
      console.error(`Delete failed: ${rmError.message}`)
      process.exit(1)
    }
  }
  if (names.length) console.log("Deleted.")
}
