// Renders a 512x512 PNG brand logo per demo org: an original symbol plus a wordmark
// (fictional orgs; original artwork; fonts from Google Fonts, OFL).
// Usage: node scripts/gen-logos.mjs   (writes supabase/seed-images/post-images/<org>/logo.png)
import { mkdirSync, writeFileSync } from "node:fs"
import { chromium } from "@playwright/test"

const project = new URL("..", import.meta.url).pathname
const id = (n) => `00000000-0000-4000-a000-0000000000${String(n).padStart(2, "0")}`
const NAVY = "#14213d"
const GOLD = "#f4b400"
const FONTS = [
  "Montserrat:wght@600;800", "DM+Serif+Display", "Merriweather:ital,wght@1,700", "Archivo:wght@800", "Cormorant+Garamond:wght@600;700",
  "Pacifico", "Nunito:wght@800", "Space+Grotesk:wght@700", "Oswald:wght@600", "Quicksand:wght@500;700", "Source+Sans+3:wght@400;700",
  "Libre+Baskerville:wght@700", "Work+Sans:wght@500;700",
]

// [background, symbol SVG (drawn in a 200x200 box), wordmark HTML]
const LOGOS = {
  1: ["#ffffff",
    `<path d="M24 92 h152 a76 76 0 0 1 -152 0z" fill="#1f7a5a"/><path d="M36 92 h128" stroke="#155e45" stroke-width="6"/>
     <rect x="74" y="164" width="52" height="10" rx="5" fill="#1f7a5a"/>
     <path d="M70 72 c-12 -14 12 -24 0 -42 M100 72 c-12 -14 12 -24 0 -42 M130 72 c-12 -14 12 -24 0 -42" stroke="#f08c2a" stroke-width="8" fill="none" stroke-linecap="round"/>`,
    `<div style="font:800 54px Montserrat;letter-spacing:4px;color:#1f7a5a">HARBOR</div><div style="font:600 30px Montserrat;letter-spacing:14px;color:#f08c2a;margin-top:-4px">TABLE</div>`],
  2: ["#2f6f9f",
    `<path d="M20 96 L100 28 L180 96" stroke="#fff" stroke-width="12" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
     <path d="M40 86 V172 H160 V86" stroke="#fff" stroke-width="12" fill="none" stroke-linejoin="round"/>
     <rect x="78" y="108" width="44" height="64" fill="#1d4f75"/><path d="M78 108 L108 118 V178 L78 172z" fill="#ffd166"/>`,
    `<div style="font:400 60px 'DM Serif Display';color:#fff">Open Door</div><div style="font:600 24px Montserrat;letter-spacing:12px;color:#ffd166;margin-top:-6px">HOMES</div>`],
  3: ["#fff7ec",
    `<path d="M100 44 C76 30 44 30 16 40 V152 C44 142 76 142 100 158z" fill="#b45309"/><path d="M100 44 C124 30 156 30 184 40 V152 C156 142 124 142 100 158z" fill="#d97706"/>
     <path d="M16 118 C56 98 82 140 100 126 C120 110 146 144 184 118" stroke="#3b82c4" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    `<div style="font:italic 700 46px Merriweather;color:#92400e">Riverbend</div><div style="font:600 24px Montserrat;letter-spacing:10px;color:#3b82c4;margin-top:4px">READERS</div>`],
  4: ["#2f5d2b",
    `<circle cx="136" cy="56" r="22" fill="#f6c453"/><path d="M0 136 C50 92 100 98 200 124 V200 H0z" fill="#5f9e4f"/>
     <path d="M0 164 C64 132 128 142 200 158 V200 H0z" fill="#8cc06b"/><path d="M118 200 C110 172 132 158 118 132" stroke="#f3ead2" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    `<div style="font:800 50px Archivo;letter-spacing:3px;color:#f3ead2">GREENWAY</div><div style="font:500 24px 'Work Sans';letter-spacing:12px;color:#c5e3a8;margin-top:2px">STEWARDS</div>`],
  5: [NAVY,
    `<path d="M36 108 a64 64 0 0 1 128 0z" fill="${GOLD}"/>
     <path d="M20 132 c18 -10 34 10 52 0 s34 10 52 0 s34 10 52 0 M36 160 c16 -9 28 9 44 0 s28 9 44 0 s28 9 44 0" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>`,
    `<div style="font:700 58px 'Cormorant Garamond';letter-spacing:6px;color:#fff">LAKESHORE</div><div style="font:600 18px Montserrat;letter-spacing:6px;color:${GOLD};margin-top:2px">COMMUNITY FOUNDATION</div>`],
  6: ["#1e3a5f",
    `<path d="M100 20 C168 56 176 128 100 182 C24 128 32 56 100 20z" fill="${GOLD}"/><path d="M100 182 C82 136 122 98 100 36" stroke="#1e3a5f" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    `<div style="font:700 52px 'Libre Baskerville';color:#fff">Riverside</div><div style="font:600 18px Montserrat;letter-spacing:7px;color:${GOLD};margin-top:6px">FAMILY FOUNDATION</div>`],
  7: ["#c2410c",
    `<path d="M100 178 C62 152 44 128 56 106 C66 88 90 90 100 108 C110 90 134 88 144 106 C156 128 138 152 100 178z" fill="#fff"/>
     <ellipse cx="54" cy="70" rx="16" ry="22" fill="#fff"/><ellipse cx="84" cy="42" rx="16" ry="22" fill="#fff"/><ellipse cx="116" cy="42" rx="16" ry="22" fill="#fff"/><ellipse cx="146" cy="70" rx="16" ry="22" fill="#fff"/>`,
    `<div style="font:400 46px Pacifico;color:#fff">Second Chance</div><div style="font:800 32px Montserrat;letter-spacing:16px;color:#fed7aa;margin-top:-2px">PAWS</div>`],
  8: ["#ffffff",
    `<circle cx="100" cy="62" r="50" fill="#15803d"/><circle cx="70" cy="80" r="30" fill="#22a052"/><circle cx="130" cy="80" r="30" fill="#22a052"/>
     <rect x="93" y="96" width="14" height="46" fill="#7c4a2d"/><rect x="20" y="140" width="160" height="7" rx="3.5" fill="#9ca3af"/>
     <path d="M100 147 v38 M100 158 l-26 22 M100 158 l26 22 M100 172 l-40 8 M100 172 l40 8" stroke="#7c4a2d" stroke-width="6" stroke-linecap="round"/>`,
    `<div style="font:800 58px Nunito;color:#15803d;letter-spacing:-1px">rooted</div><div style="font:700 24px Nunito;color:#7c4a2d;letter-spacing:4px;margin-top:-6px">neighborhoods</div>`],
  9: ["#6d28d9",
    `<path d="M24 46 L60 158 L100 82 L140 158 L176 46" stroke="#f9a8d4" stroke-width="26" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M32 50 L64 150" stroke="#fde047" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="178" cy="166" r="9" fill="#fde047"/>`,
    `<div style="font:700 50px 'Space Grotesk';color:#fff;letter-spacing:2px">WESTSIDE</div><div style="font:500 26px 'Space Grotesk';color:#f9a8d4;letter-spacing:6px">arts studio</div>`],
  10: ["#e0f2f1",
    `<defs><clipPath id="b"><circle cx="100" cy="100" r="78"/></clipPath></defs><circle cx="100" cy="100" r="78" fill="#fff"/>
     <g clip-path="url(#b)" fill="#0e7490"><polygon points="100,72 127,91 117,123 83,123 73,91"/>
       <polygon points="100,22 124,8 140,30 124,44 100,40" /><polygon points="164,74 186,86 182,114 160,112 152,90"/>
       <polygon points="146,152 156,176 132,188 120,168 132,150"/><polygon points="54,152 68,150 80,168 68,188 44,176"/><polygon points="36,74 48,90 40,112 18,114 14,86"/></g>
     <circle cx="100" cy="100" r="78" fill="none" stroke="#0b5566" stroke-width="7"/>`,
    `<div style="font:600 54px Oswald;color:#0b5566;letter-spacing:3px">NORTHSIDE</div><div style="font:600 22px Montserrat;color:#0e7490;letter-spacing:7px">YOUTH SOCCER</div>`],
  11: ["#9d174d",
    `<path d="M10 128 C54 52 146 52 190 128" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M10 128 H190" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
     <path d="M54 128 V92 M100 128 V76 M146 128 V92" stroke="#fff" stroke-width="7"/>
     <path d="M30 158 c18 -9 32 9 50 0 s32 9 50 0 s26 7 44 0" stroke="#f9a8d4" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    `<div style="font:400 62px 'DM Serif Display';color:#fff">Bridge</div><div style="font:600 20px Montserrat;color:#f9a8d4;letter-spacing:7px;margin-top:-4px">WELCOME CENTER</div>`],
  12: ["#4f46e5",
    `<circle cx="78" cy="100" r="54" fill="#c7d2fe"/><circle cx="122" cy="100" r="54" fill="#fff" opacity=".85"/><circle cx="100" cy="100" r="12" fill="#4f46e5"/>`,
    `<div style="font:700 52px Quicksand;color:#fff">clear minds</div><div style="font:500 24px Quicksand;color:#c7d2fe;letter-spacing:8px">collective</div>`],
  13: ["#92400e",
    `<path d="M36 178 V92 a64 64 0 0 1 128 0 V178" fill="#fde9c7"/>
     <g fill="#92400e"><rect x="56" y="100" width="12" height="70"/><rect x="74" y="86" width="12" height="84"/><rect x="92" y="78" width="18" height="92"/><rect x="116" y="88" width="12" height="82"/><rect x="134" y="104" width="12" height="66"/></g>
     <rect x="36" y="170" width="128" height="9" fill="#fde9c7"/>`,
    `<div style="font:800 50px Archivo;color:#fde9c7;letter-spacing:4px">OPEN</div><div style="font:800 50px Archivo;color:#fbbf24;letter-spacing:4px;margin-top:-10px">SHELVES</div>`],
  14: ["#ffffff",
    `<path d="M76 20 h48 v56 h56 v48 h-56 v56 h-48 v-56 h-56 v-48 h56z" fill="#0f766e" stroke="#0f766e" stroke-width="14" stroke-linejoin="round"/>
     <path d="M100 138 C80 122 70 112 74 98 C79 86 93 86 100 96 C107 86 121 86 126 98 C130 112 120 122 100 138z" fill="#ef4444"/>`,
    `<div style="font:400 38px 'Source Sans 3';color:#0f766e">Neighborhood</div><div style="font:700 34px 'Source Sans 3';color:#0f766e;letter-spacing:6px">HEALTH CORPS</div>`],
  15: [NAVY,
    `<circle cx="100" cy="100" r="76" fill="none" stroke="#fff" stroke-width="9"/><ellipse cx="100" cy="100" rx="32" ry="76" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>
     <path d="M24 104 H70 L82 76 L100 132 L114 90 L124 104 H176" stroke="${GOLD}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<div style="font:700 58px 'Cormorant Garamond';color:#fff;letter-spacing:8px">MERIDIAN</div><div style="font:600 18px Montserrat;color:${GOLD};letter-spacing:6px;margin-top:2px">HEALTH FOUNDATION</div>`],
}

const fontsLink = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f}`).join("&")}&display=block`
const b = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
const p = await b.newPage({ viewport: { width: 512, height: 512 } })
for (const [n, [bg, symbol, wordmark]] of Object.entries(LOGOS)) {
  await p.setContent(`<html><head><link rel="stylesheet" href="${fontsLink}"></head>
    <body style="margin:0;width:512px;height:512px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.05">
      <svg width="236" height="236" viewBox="0 0 200 200">${symbol}</svg>
      <div style="margin-top:14px">${wordmark}</div>
    </body></html>`)
  await p.evaluate(() => document.fonts.ready)
  const dir = `${project}/supabase/seed-images/post-images/${id(Number(n))}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/logo.png`, await p.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } }))
}
await b.close()
console.log("logos:", Object.keys(LOGOS).length)
