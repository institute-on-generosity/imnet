// Renders a 512x512 icon per demo community (F-103): an original illustrated scene, like a group
// avatar. No people's faces (dignity rule), no real-org marks. Fictional communities only.
// Usage: node scripts/gen-community-icons.mjs  (writes supabase/seed-images/post-images/communities/<id>/icon.png)
import { mkdirSync, writeFileSync } from "node:fs"
import { chromium } from "@playwright/test"

const project = new URL("..", import.meta.url).pathname
const gid = (n) => `00000000-0000-4000-e000-${String(n).padStart(12, "0")}`

// Each scene is drawn in a 200x200 box. g(id, a, b) = vertical gradient.
const g = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const steam = (x, c = "#fff") => `<path d="M${x} 70 c-8 -10 8 -16 0 -28 M${x + 18} 70 c-8 -10 8 -16 0 -28 M${x + 36} 70 c-8 -10 8 -16 0 -28" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>`

const ICONS = {
  // Portland weekend food volunteers: a steaming pot on a warm kitchen glow
  1: `<defs>${g("a", "#fdba74", "#c2410c")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="100" cy="120" r="70" fill="#fff" opacity=".12"/>
      ${steam(73)}
      <path d="M40 92 h120 v14 a46 40 0 0 1 -46 40 h-28 a46 40 0 0 1 -46 -40z" fill="#7c2d12"/>
      <path d="M40 92 h120 v10 h-120z" fill="#9a3412"/><rect x="28" y="96" width="16" height="8" rx="4" fill="#7c2d12"/><rect x="156" y="96" width="16" height="8" rx="4" fill="#7c2d12"/>
      <path d="M54 118 q46 14 92 0" stroke="#fdba74" stroke-width="4" fill="none" opacity=".6"/><rect x="0" y="160" width="200" height="40" fill="#431407" opacity=".35"/>`,
  // Monthly givers circle: interlocking hearts over a soft dusk
  2: `<defs>${g("a", "#c4b5fd", "#6d28d9")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="160" cy="40" r="46" fill="#fff" opacity=".1"/><circle cx="30" cy="170" r="60" fill="#fff" opacity=".08"/>
      <path d="M78 150 C40 124 30 98 46 80 C60 64 78 70 86 84 C94 70 112 64 126 80 C142 98 132 124 94 150z" fill="#f472b6" opacity=".95"/>
      <path d="M110 154 C72 128 62 102 78 84 C92 68 110 74 118 88 C126 74 144 68 158 84 C174 102 164 128 126 154z" fill="#fde047" stroke="#6d28d9" stroke-width="5"/>`,
  // Street tree planters: young street tree on a sunny block
  3: `<defs>${g("a", "#bef264", "#4d7c0f")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="152" cy="46" r="20" fill="#fef08a"/>
      <rect x="0" y="150" width="200" height="50" fill="#57534e"/><rect x="0" y="146" width="200" height="8" fill="#a8a29e"/>
      <path d="M20 174 h30 M80 174 h30 M140 174 h30" stroke="#fde68a" stroke-width="5"/>
      <rect x="94" y="96" width="12" height="54" rx="3" fill="#78350f"/>
      <circle cx="100" cy="78" r="34" fill="#166534"/><circle cx="76" cy="92" r="22" fill="#15803d"/><circle cx="124" cy="92" r="22" fill="#15803d"/><circle cx="100" cy="66" r="20" fill="#22c55e"/>
      <path d="M84 150 h32" stroke="#713f12" stroke-width="6" stroke-linecap="round"/>`,
  // Kitten fosters: a sleeping kitten on a teal blanket
  4: `<defs>${g("a", "#99f6e4", "#0f766e")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <ellipse cx="100" cy="150" rx="80" ry="22" fill="#134e4a" opacity=".35"/>
      <path d="M44 140 C44 104 76 90 108 92 C142 94 160 116 156 140z" fill="#fb923c"/>
      <circle cx="58" cy="118" r="26" fill="#fb923c"/><path d="M38 102 l6 -22 14 16z M66 96 l12 -18 6 20z" fill="#fb923c"/>
      <path d="M48 120 q6 4 12 0 M64 120 q6 4 12 0" stroke="#7c2d12" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M150 136 c22 -4 26 -26 8 -30" stroke="#fb923c" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M90 104 q10 6 0 14 M112 102 q10 6 0 14 M134 108 q8 6 0 12" stroke="#ea580c" stroke-width="5" fill="none" stroke-linecap="round"/>
      <text x="150" y="70" font-family="Georgia" font-size="22" fill="#fff" opacity=".85">z</text><text x="166" y="52" font-family="Georgia" font-size="16" fill="#fff" opacity=".7">z</text>`,
  // Youth mentors: an open book with a rising star
  5: `<defs>${g("a", "#93c5fd", "#1e40af")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <path d="M100 30 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3z" fill="#fde047"/>
      <path d="M100 116 C78 102 50 102 26 110 V168 C50 160 78 160 100 174z" fill="#fff"/><path d="M100 116 C122 102 150 102 174 110 V168 C150 160 122 160 100 174z" fill="#e0e7ff"/>
      <path d="M40 124 q24 -6 46 2 M40 138 q24 -6 46 2 M40 152 q24 -6 46 2 M114 126 q22 -8 46 -2 M114 140 q22 -8 46 -2" stroke="#93c5fd" stroke-width="3" fill="none"/>`,
  // Health screening volunteers: heart with a pulse line
  6: `<defs>${g("a", "#fecdd3", "#be123c")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="100" cy="104" r="72" fill="#fff" opacity=".14"/>
      <path d="M100 160 C52 128 36 98 52 74 C66 54 90 58 100 78 C110 58 134 54 148 74 C164 98 148 128 100 160z" fill="#fff"/>
      <path d="M44 106 h34 l10 -22 14 44 12 -30 8 8 h34" stroke="#e11d48" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Bay Area giving circle: a suspension bridge in fog at sunset
  7: `<defs>${g("a", "#fdba74", "#7c3aed")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="100" cy="118" r="34" fill="#fde68a" opacity=".9"/>
      <rect x="0" y="140" width="200" height="60" fill="#1e1b4b" opacity=".75"/>
      <path d="M0 130 H200" stroke="#991b1b" stroke-width="5"/><rect x="52" y="64" width="10" height="80" fill="#b91c1c"/><rect x="138" y="64" width="10" height="80" fill="#b91c1c"/>
      <path d="M0 84 Q57 136 57 66 Q100 128 143 66 Q143 136 200 84" stroke="#dc2626" stroke-width="3" fill="none"/>
      <path d="M0 150 q50 -10 100 0 t100 0 V200 H0z" fill="#e2e8f0" opacity=".35"/>`,
  // Oakland creek cleanup crew: a creek through oaks
  8: `<defs>${g("a", "#a7f3d0", "#047857")}${g("w", "#38bdf8", "#0369a1")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <path d="M0 120 C40 96 80 140 120 112 C150 92 176 104 200 96 V200 H0z" fill="#065f46"/>
      <path d="M70 200 C80 170 120 160 110 134 C104 118 128 108 150 112 L162 118 C140 118 124 126 130 138 C140 162 108 176 104 200z" fill="url(#w)"/>
      <circle cx="44" cy="92" r="24" fill="#14532d"/><rect x="41" y="104" width="6" height="22" fill="#422006"/>
      <circle cx="164" cy="74" r="20" fill="#14532d"/><rect x="161" y="84" width="6" height="20" fill="#422006"/>
      <path d="M118 150 q8 -4 16 0" stroke="#e0f2fe" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  // Mountain View weekend volunteers: two hands holding a heart
  9: `<defs>${g("a", "#86efac", "#15803d")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="100" cy="96" r="70" fill="#fff" opacity=".12"/>
      <path d="M100 104 C78 90 70 74 80 62 C88 52 100 56 100 66 C100 56 112 52 120 62 C130 74 122 90 100 104z" fill="#f97316"/>
      <path d="M30 120 C52 112 70 116 86 128 L100 138 L114 128 C130 116 148 112 170 120 L170 150 C146 146 128 152 112 166 H88 C72 152 54 146 30 150z" fill="#fef3c7"/>
      <path d="M30 120 C52 112 70 116 86 128 L100 138" stroke="#d97706" stroke-width="3" fill="none"/><path d="M170 120 C148 112 130 116 114 128 L100 138" stroke="#d97706" stroke-width="3" fill="none"/>`,
  // South Bay giving circle: hands in a circle, seen from above (abstract dots ring)
  10: `<defs>${g("a", "#fde68a", "#d97706")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="100" cy="100" r="58" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
      ${Array.from({ length: 8 }, (_, i) => { const t = (i / 8) * Math.PI * 2; const x = 100 + Math.cos(t) * 58, y = 100 + Math.sin(t) * 58; const c = ["#7c2d12", "#b45309", "#0f766e", "#1e3a8a", "#9d174d", "#4d7c0f", "#6d28d9", "#be123c"][i]; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" fill="${c}"/>` }).join("")}
      <circle cx="100" cy="100" r="26" fill="#fff"/><path d="M100 112 C88 104 84 96 90 90 C94 86 100 88 100 92 C100 88 106 86 110 90 C116 96 112 104 100 112z" fill="#dc2626"/>`,
  // Bay trail stewards: a heron in the marsh at dawn
  11: `<defs>${g("a", "#bae6fd", "#0e7490")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <circle cx="58" cy="60" r="22" fill="#fef9c3" opacity=".9"/>
      <rect x="0" y="146" width="200" height="54" fill="#155e75"/><path d="M0 150 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0" stroke="#a5f3fc" stroke-width="3" fill="none"/>
      <path d="M18 146 v-26 M26 146 v-34 M34 146 v-22 M166 146 v-30 M174 146 v-40 M182 146 v-24" stroke="#365314" stroke-width="4" stroke-linecap="round"/>
      <path d="M112 146 l-4 -40 M120 146 l2 -40" stroke="#334155" stroke-width="3"/>
      <path d="M96 106 C92 86 108 72 126 78 C138 82 140 96 130 104 C122 110 106 112 96 106z" fill="#e2e8f0"/>
      <path d="M126 80 C130 62 132 50 128 40 C126 34 132 30 136 34" stroke="#e2e8f0" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M136 34 l18 4 -18 2z" fill="#f59e0b"/>`,
  // Sunnyvale foster pets: a dog and a cat side by side
  12: `<defs>${g("a", "#fbcfe8", "#be185d")}</defs><rect width="200" height="200" fill="url(#a)"/>
      <ellipse cx="100" cy="166" rx="84" ry="16" fill="#831843" opacity=".3"/>
      <path d="M40 166 V122 C40 100 58 88 76 88 C94 88 108 100 108 122 V166z" fill="#a16207"/>
      <ellipse cx="74" cy="92" rx="30" ry="26" fill="#ca8a04"/><path d="M46 80 C36 92 38 112 50 112 C56 100 54 88 46 80z M102 80 C112 92 110 112 98 112 C92 100 94 88 102 80z" fill="#713f12"/>
      <circle cx="64" cy="90" r="4" fill="#1c1917"/><circle cx="84" cy="90" r="4" fill="#1c1917"/><ellipse cx="74" cy="102" rx="7" ry="5" fill="#1c1917"/>
      <path d="M116 166 V128 C116 112 128 104 142 104 C156 104 166 112 166 128 V166z" fill="#e5e7eb"/>
      <circle cx="141" cy="104" r="22" fill="#f3f4f6"/><path d="M122 92 l2 -20 14 12z M160 92 l-2 -20 -14 12z" fill="#f3f4f6"/>
      <circle cx="133" cy="104" r="3.5" fill="#15803d"/><circle cx="149" cy="104" r="3.5" fill="#15803d"/><path d="M137 112 q4 3 8 0" stroke="#9ca3af" stroke-width="2.5" fill="none"/>`,
}

const b = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
const p = await b.newPage({ viewport: { width: 512, height: 512 } })
const only = process.env.ONLY?.split(",")
for (const [n, scene] of Object.entries(ICONS).filter(([n]) => !only || only.includes(n))) {
  await p.setContent(`<body style="margin:0"><svg width="512" height="512" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${scene}</svg></body>`)
  const dir = `${project}/supabase/seed-images/post-images/communities/${gid(Number(n))}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/icon.png`, await p.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } }))
}
await b.close()
console.log("community icons:", Object.keys(ICONS).length)
