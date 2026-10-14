// Renders a 256x256 PNG logo per demo org: a Lucide icon (ISC) on a brand-colored tile.
// Usage: node scripts/gen-logos.mjs   (writes supabase/seed-images/post-images/<org>/logo.png)
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { chromium } from "@playwright/test"
const project = new URL("..", import.meta.url).pathname
const icon = (name) => {
  const src = readFileSync(`${project}/node_modules/lucide-react/dist/esm/icons/${name}.mjs`, "utf8")
  const match = src.match(/const __iconData = (\{[\s\S]*?\n\});/)
  const alias = src.match(/export \{ default \} from '\.\/([\w-]+)\.mjs'/)
  if (!match && alias) return icon(alias[1])
  if (!match) throw new Error(`can't parse icon ${name}`)
  const data = Function(`return (${match[1]})`)()
  return data.node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("")
}
const id = (n) => `00000000-0000-4000-a000-0000000000${String(n).padStart(2, "0")}`
// [org number, icon, tile color, icon color]
const orgs = [
  [1, "utensils", "#1f7a5a", "#ffffff"], [2, "house", "#2f6f9f", "#ffffff"], [3, "book-open", "#b45309", "#ffffff"],
  [4, "trees", "#3f7d3a", "#ffffff"], [5, "waves", "#14213d", "#f4b400"], [6, "sprout", "#1e3a5f", "#f4b400"],
  [7, "paw-print", "#c2410c", "#ffffff"], [8, "tree-deciduous", "#15803d", "#ffffff"], [9, "palette", "#7c3aed", "#ffffff"],
  [10, "goal", "#0e7490", "#ffffff"], [11, "handshake", "#9d174d", "#ffffff"], [12, "brain", "#4f46e5", "#ffffff"],
  [13, "library", "#92400e", "#ffffff"], [14, "stethoscope", "#0f766e", "#ffffff"], [15, "heart-pulse", "#14213d", "#f4b400"],
]
const b = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
const p = await b.newPage({ viewport: { width: 256, height: 256 } })
for (const [n, name, bg, fg] of orgs) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${bg}"/><g transform="translate(56 56) scale(6)" fill="none" stroke="${fg}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${icon(name)}</g></svg>`
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`)
  const dir = `${project}/supabase/seed-images/post-images/${id(n)}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/logo.png`, await p.screenshot({ clip: { x: 0, y: 0, width: 256, height: 256 } }))
}
await b.close()
console.log("logos:", orgs.length)
