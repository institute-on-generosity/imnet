// Renders a 256x256 PNG logo per demo org from hand-drawn SVG marks (fictional orgs, original artwork).
// Usage: node scripts/gen-logos.mjs   (writes supabase/seed-images/post-images/<org>/logo.png)
import { mkdirSync, writeFileSync } from "node:fs"
import { chromium } from "@playwright/test"

const project = new URL("..", import.meta.url).pathname
const id = (n) => `00000000-0000-4000-a000-0000000000${String(n).padStart(2, "0")}`
const NAVY = "#14213d"
const GOLD = "#f4b400"

// Each entry: background, then the mark drawn on a 256x256 canvas.
const LOGOS = {
  // Harbor Table: a bowl with rising steam
  1: ["#ffffff", `
    <path d="M44 120 h168 a84 84 0 0 1 -168 0z" fill="#1f7a5a"/>
    <rect x="96" y="200" width="64" height="14" rx="7" fill="#1f7a5a"/>
    <path d="M96 96 c-14 -16 14 -28 0 -48 M128 96 c-14 -16 14 -28 0 -48 M160 96 c-14 -16 14 -28 0 -48" stroke="#f08c2a" stroke-width="10" fill="none" stroke-linecap="round"/>`],
  // Open Door Homes: house outline with a door swung open
  2: ["#2f6f9f", `
    <path d="M40 124 L128 48 L216 124" stroke="#fff" stroke-width="14" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M64 112 V208 H192 V112" stroke="#fff" stroke-width="14" fill="none" stroke-linejoin="round"/>
    <rect x="104" y="136" width="48" height="72" fill="#1d4f75"/>
    <path d="M104 136 L136 148 V214 L104 208z" fill="#ffd166"/>`],
  // Riverbend Readers: open book whose pages are crossed by a river
  3: ["#fff7ec", `
    <path d="M128 76 C100 60 64 60 36 70 V190 C64 180 100 180 128 196z" fill="#b45309"/>
    <path d="M128 76 C156 60 192 60 220 70 V190 C192 180 156 180 128 196z" fill="#d97706"/>
    <path d="M36 152 C80 130 108 176 128 160 C150 142 180 178 220 150" stroke="#3b82c4" stroke-width="12" fill="none" stroke-linecap="round"/>`],
  // Greenway Stewards: hills with a path winding to the sun
  4: ["#2f5d2b", `
    <circle cx="172" cy="84" r="26" fill="#f6c453"/>
    <path d="M0 176 C60 120 120 128 256 160 V256 H0z" fill="#5f9e4f"/>
    <path d="M0 208 C80 168 160 180 256 200 V256 H0z" fill="#8cc06b"/>
    <path d="M150 256 C140 222 168 204 150 172" stroke="#f3ead2" stroke-width="12" fill="none" stroke-linecap="round"/>`],
  // Lakeshore Community Foundation: sun over the lake
  5: [NAVY, `
    <path d="M60 136 a68 68 0 0 1 136 0z" fill="${GOLD}"/>
    <path d="M44 160 c20 -12 36 12 56 0 s36 12 56 0 s36 12 56 0 M60 190 c16 -10 30 10 46 0 s30 10 46 0 s30 10 46 0" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/>`],
  // Riverside Family Foundation: a leaf with a river through it
  6: ["#1e3a5f", `
    <path d="M128 40 C200 80 208 160 128 216 C48 160 56 80 128 40z" fill="${GOLD}"/>
    <path d="M128 216 C110 170 150 130 128 60" stroke="#1e3a5f" stroke-width="10" fill="none" stroke-linecap="round"/>`],
  // Second Chance Paws: a paw print with a heart pad
  7: ["#c2410c", `
    <path d="M128 212 C90 186 70 162 82 140 C92 122 116 124 128 142 C140 124 164 122 174 140 C186 162 166 186 128 212z" fill="#fff"/>
    <ellipse cx="80" cy="104" rx="18" ry="24" fill="#fff"/><ellipse cx="112" cy="76" rx="18" ry="24" fill="#fff"/>
    <ellipse cx="144" cy="76" rx="18" ry="24" fill="#fff"/><ellipse cx="176" cy="104" rx="18" ry="24" fill="#fff"/>`],
  // Rooted Neighborhoods: a tree and its roots below the street line
  8: ["#ffffff", `
    <circle cx="128" cy="92" r="56" fill="#15803d"/><circle cx="96" cy="110" r="34" fill="#22a052"/><circle cx="160" cy="110" r="34" fill="#22a052"/>
    <rect x="120" y="128" width="16" height="52" fill="#7c4a2d"/>
    <rect x="40" y="176" width="176" height="8" rx="4" fill="#9ca3af"/>
    <path d="M128 184 v40 M128 196 l-28 24 M128 196 l28 24 M128 210 l-44 10 M128 210 l44 10" stroke="#7c4a2d" stroke-width="7" stroke-linecap="round"/>`],
  // Westside Arts Studio: a painted W
  9: ["#6d28d9", `
    <path d="M44 72 L84 188 L128 104 L172 188 L212 72" stroke="#f9a8d4" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 76 L88 180" stroke="#fde047" stroke-width="8" fill="none" stroke-linecap="round" opacity=".9"/>
    <circle cx="212" cy="196" r="10" fill="#fde047"/>`],
  // Northside Youth Soccer: a soccer ball
  10: ["#e0f2f1", `
    <defs><clipPath id="ball"><circle cx="128" cy="128" r="84"/></clipPath></defs>
    <circle cx="128" cy="128" r="84" fill="#fff"/>
    <g clip-path="url(#ball)"><polygon points="128.0,98.0 156.5,118.7 145.6,152.3 110.4,152.3 99.5,118.7" fill="#0e7490"/><polygon points="128.0,76.0 103.3,58.0 112.7,29.0 143.3,29.0 152.7,58.0" fill="#0e7490"/><polygon points="177.5,111.9 186.9,82.9 217.5,82.9 226.9,111.9 202.2,129.9" fill="#0e7490"/><polygon points="158.6,170.1 189.1,170.1 198.6,199.1 173.8,217.1 149.1,199.1" fill="#0e7490"/><polygon points="97.4,170.1 106.9,199.1 82.2,217.1 57.4,199.1 66.9,170.1" fill="#0e7490"/><polygon points="78.5,111.9 53.8,129.9 29.1,111.9 38.5,82.9 69.1,82.9" fill="#0e7490"/><path d="M128.0 98.0 L128.0 72.0" stroke="#0e7490" stroke-width="5"/><path d="M156.5 118.7 L181.3 110.7" stroke="#0e7490" stroke-width="5"/><path d="M145.6 152.3 L160.9 173.3" stroke="#0e7490" stroke-width="5"/><path d="M110.4 152.3 L95.1 173.3" stroke="#0e7490" stroke-width="5"/><path d="M99.5 118.7 L74.7 110.7" stroke="#0e7490" stroke-width="5"/></g>
    <circle cx="128" cy="128" r="84" fill="none" stroke="#0b5566" stroke-width="8"/>`],
  // Bridge Welcome Center: an arch bridge over water
  11: ["#9d174d", `
    <path d="M28 164 C72 84 184 84 228 164" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M28 164 H228" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <path d="M76 164 V120 M128 164 V104 M180 164 V120" stroke="#fff" stroke-width="8"/>
    <path d="M48 196 c20 -10 36 10 56 0 s36 10 56 0 s28 8 48 0" stroke="#f9a8d4" stroke-width="8" fill="none" stroke-linecap="round"/>`],
  // Clear Minds Collective: two calm overlapping circles
  12: ["#4f46e5", `
    <circle cx="104" cy="128" r="62" fill="#c7d2fe"/>
    <circle cx="152" cy="128" r="62" fill="#fff" opacity=".85"/>
    <circle cx="128" cy="128" r="14" fill="#4f46e5"/>`],
  // Open Shelves: an arched doorway made of book spines
  13: ["#92400e", `
    <path d="M56 212 V120 a72 72 0 0 1 144 0 V212" fill="#fde9c7"/>
    <g fill="#92400e"><rect x="78" y="128" width="14" height="76"/><rect x="98" y="112" width="14" height="92"/><rect x="118" y="104" width="20" height="100"/><rect x="144" y="114" width="14" height="90"/><rect x="164" y="132" width="14" height="72"/></g>
    <rect x="56" y="204" width="144" height="10" fill="#fde9c7"/>`],
  // Neighborhood Health Corps: a rounded cross holding a heart
  14: ["#ffffff", `
    <path d="M100 40 h56 v60 h60 v56 h-60 v60 h-56 v-60 h-60 v-56 h60z" fill="#0f766e" stroke="#0f766e" stroke-width="16" stroke-linejoin="round"/>
    <path d="M128 168 C104 150 92 138 98 122 C104 108 120 108 128 120 C136 108 152 108 158 122 C164 138 152 150 128 168z" fill="#ef4444"/>`],
  // Meridian Health Foundation: a globe with a meridian and a pulse
  15: [NAVY, `
    <circle cx="128" cy="128" r="84" fill="none" stroke="#fff" stroke-width="10"/>
    <ellipse cx="128" cy="128" rx="36" ry="84" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>
    <path d="M44 132 H96 L110 100 L128 164 L144 116 L156 132 H212" stroke="${GOLD}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`],
}

const b = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
const p = await b.newPage({ viewport: { width: 256, height: 256 } })
for (const [n, [bg, mark]] of Object.entries(LOGOS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${bg}"/>${mark}</svg>`
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`)
  const dir = `${project}/supabase/seed-images/post-images/${id(Number(n))}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/logo.png`, await p.screenshot({ clip: { x: 0, y: 0, width: 256, height: 256 } }))
}
await b.close()
console.log("logos:", Object.keys(LOGOS).length)
