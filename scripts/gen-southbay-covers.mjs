// F-120 Cover photos for the South Bay demo orgs (46-56): each is cropped from an openly licensed
// photo already in the demo library (same subject), and its credit is copied to the new file.
// Usage: node scripts/gen-southbay-covers.mjs
import { readFileSync, writeFileSync } from "node:fs"
import sharp from "sharp"

const project = new URL("..", import.meta.url).pathname
const IMG = `${project}supabase/seed-images/post-images`
const oid = (n) => `00000000-0000-4000-a000-0000000000${String(n).padStart(2, "0")}`
const COVERS = {
  46: `${oid(24)}/20111031-fns-lsc-0110-6677167995-c640c7.webp`, // cooks prepping in a kitchen
  47: `${oid(40)}/planting-native-grasses-on-a-rec-40fd1f.webp`, // volunteers planting a wetland
  48: `${oid(3)}/children-s-reading-corner-1-at-b-7450e5.webp`, // a reading corner
  49: `${oid(7)}/deployed-soldiers-volunteer-at-a-d71e71.webp`, // volunteers walking shelter dogs
  50: `${oid(35)}/9759japanese-memorial-garden-cav-56770a.webp`, // a quiet garden lawn
  51: `${oid(34)}/computer-programming-class-3110db.webp`, // people coding by monitor light
  52: `${oid(2)}/keys-at-door.jpg`, // house keys at a door
  53: `${oid(37)}/therapy-room-at-resilient-mind-t-416f2d.webp`, // a counseling room
  54: `${oid(44)}/huntington-free-library-and-read-964731.webp`, // a small brick library
  55: `${oid(1)}/lots-to-learn-at-farm-lot-59-202-4b15fe.webp`, // a market cart of greens
  56: `${oid(41)}/pier-62-skatepark-pool-looking-e-1a4da3.webp`, // a skatepark bowl
}

const credits = JSON.parse(readFileSync(`${IMG}/../credits.json`, "utf8"))
const rows = []
for (const [n, src] of Object.entries(COVERS)) {
  const out = `${oid(Number(n))}/cover.webp`
  await sharp(`${IMG}/${src}`).resize(1584, 396, { fit: "cover", position: "centre" }).webp({ quality: 78 }).toFile(`${IMG}/${out}`)
  const c = credits.find((x) => x.path === src)
  if (!c) throw new Error(`no credit for ${src}`)
  // Replace any earlier credit for this cover (the source may have changed).
  const i = credits.findIndex((x) => x.path === out)
  if (i >= 0) credits.splice(i, 1)
  credits.push({ ...c, path: out, alt: "" })
  rows.push(`- \`${out}\`: [${c.title.replace(/^File:/, "")}](${c.source}), ${c.artist}, ${c.license} (cropped)`)
}
writeFileSync(`${IMG}/../credits.json`, JSON.stringify(credits, null, 2) + "\n")
// Rewrite this section of CREDITS.md each run.
const md = readFileSync(`${IMG}/../CREDITS.md`, "utf8").split("\n## South Bay demo covers (F-120)")[0].trimEnd()
writeFileSync(`${IMG}/../CREDITS.md`, `${md}\n\n## South Bay demo covers (F-120)\n\n${rows.join("\n")}\n`)
console.log("covers:", Object.keys(COVERS).length, "new credits:", rows.length)
