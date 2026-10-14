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
  "Libre+Baskerville:wght@700", "Work+Sans:wght@500;700", "Fraunces:wght@700", "Lora:wght@700", "Rubik:wght@700", "Josefin+Sans:wght@700", "Playfair+Display:wght@700", "Barlow+Condensed:wght@700", "Caveat:wght@700", "Raleway:wght@800",
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

// Orgs 16-45: a reusable symbol set, recolored, with each org's own wordmark styling.
const S = {
  van: (f, a) => `<rect x="18" y="70" width="110" height="70" rx="10" fill="${f}"/><path d="M128 90 h30 l24 26 v24 h-54z" fill="${f}"/><rect x="138" y="96" width="22" height="18" rx="3" fill="${a}"/><circle cx="56" cy="148" r="16" fill="${a}"/><circle cx="150" cy="148" r="16" fill="${a}"/><path d="M40 100 h60" stroke="${a}" stroke-width="8" stroke-linecap="round"/>`,
  keystone: (f, a) => `<path d="M24 176 V110 a76 76 0 0 1 152 0 V176 h-30 V110 a46 46 0 0 0 -92 0 V176z" fill="${f}"/><path d="M84 36 h32 l-4 42 h-24z" fill="${a}"/><path d="M24 140 h30 M146 140 h30 M34 84 l26 14 M166 84 l-26 14" stroke="#334155" stroke-width="5"/>`,
  pencil: (f, a) => `<path d="M50 150 L140 60 L160 80 L70 170 L40 180z" fill="${f}"/><path d="M140 60 L152 48 a10 10 0 0 1 14 0 l6 6 a10 10 0 0 1 0 14 L160 80z" fill="${a}"/><path d="M40 180 l10 -30 l20 20z" fill="${a}"/>`,
  heron: (f, a) => `<path d="M60 170 C70 120 120 110 120 70 C120 50 104 40 92 48 L70 40 L94 60 C104 64 104 80 94 92 C70 116 46 130 60 170z" fill="${f}"/><path d="M20 170 c20 -10 40 10 60 0 s40 10 60 0 s30 8 40 0" stroke="${a}" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  lantern: (f, a) => `<rect x="84" y="20" width="32" height="14" rx="4" fill="${f}"/><path d="M60 50 h80 l-8 110 h-64z" fill="${f}"/><path d="M100 76 c-14 18 -10 36 0 46 c10 -10 14 -28 0 -46z" fill="${a}"/><rect x="52" y="160" width="96" height="14" rx="5" fill="${f}"/>`,
  hearth: (f, a) => `<path d="M20 100 L100 30 L180 100 V176 H20z" fill="${f}"/><path d="M100 160 c-26 -10 -30 -40 -8 -60 c0 16 10 18 14 10 c10 18 20 40 -6 50z" fill="${a}"/>`,
  bird: (f, a) => `<path d="M20 110 C60 60 100 70 120 96 C140 70 170 64 186 72 C160 80 140 104 120 126 C90 150 50 140 20 110z" fill="${f}"/><circle cx="160" cy="80" r="4" fill="${a}"/><path d="M20 168 c30 -12 60 12 90 0 s50 10 72 0" stroke="${a}" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  note: (f, a) => `<path d="M80 40 L160 24 V130" stroke="${f}" stroke-width="14" fill="none" stroke-linejoin="round"/><path d="M80 40 V146" stroke="${f}" stroke-width="14"/><ellipse cx="62" cy="150" rx="26" ry="20" fill="${f}"/><ellipse cx="142" cy="134" rx="26" ry="20" fill="${f}"/><path d="M80 66 L160 50" stroke="${a}" stroke-width="10"/>`,
  table: (f, a) => `<rect x="20" y="96" width="160" height="16" rx="6" fill="${f}"/><path d="M40 112 V172 M160 112 V172" stroke="${f}" stroke-width="12" stroke-linecap="round"/><path d="M60 92 a40 40 0 0 1 80 0z" fill="${a}"/><circle cx="100" cy="44" r="10" fill="${a}"/>`,
  path: (f, a) => `<path d="M100 180 C60 150 140 120 100 90 C70 66 120 44 100 20" stroke="${f}" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="150" cy="50" r="18" fill="${a}"/>`,
  oak: (f, a) => `<circle cx="100" cy="76" r="56" fill="${f}"/><rect x="90" y="110" width="20" height="60" rx="4" fill="${a}"/><ellipse cx="74" cy="160" rx="10" ry="13" fill="${a}"/><path d="M68 148 h12" stroke="${f}" stroke-width="6" stroke-linecap="round"/>`,
  tooth: (f, a) => `<path d="M100 44 C70 20 30 36 40 84 C46 112 54 130 60 170 C64 186 80 186 84 168 L92 130 C96 120 104 120 108 130 L116 168 C120 186 136 186 140 170 C146 130 154 112 160 84 C170 36 130 20 100 44z" fill="${f}"/><path d="M150 30 l6 -14 l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6z" fill="${a}"/>`,
  wheat: (f, a) => `<path d="M100 180 V40" stroke="${f}" stroke-width="8" stroke-linecap="round"/>${[50, 76, 102, 128].map((y) => `<ellipse cx="82" cy="${y}" rx="10" ry="20" transform="rotate(-30 82 ${y})" fill="${f}"/><ellipse cx="118" cy="${y}" rx="10" ry="20" transform="rotate(30 118 ${y})" fill="${f}"/>`).join("")}<circle cx="100" cy="30" r="8" fill="${a}"/>`,
  masks: (f, a) => `<path d="M30 40 h70 v50 a35 35 0 0 1 -70 0z" fill="${f}"/><path d="M100 80 h70 v50 a35 35 0 0 1 -70 0z" fill="${a}"/><path d="M48 96 q17 14 34 0" stroke="${a}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M118 146 q17 -14 34 0" stroke="${f}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  gate: (f, a) => `<path d="M30 180 V70 a70 70 0 0 1 140 0 V180" stroke="${f}" stroke-width="16" fill="none"/><path d="M62 180 V90 M100 180 V80 M138 180 V90" stroke="${f}" stroke-width="8"/><circle cx="100" cy="46" r="12" fill="${a}"/>`,
  bowl: (f, a) => `<path d="M24 92 h152 a76 76 0 0 1 -152 0z" fill="${f}"/><path d="M100 70 c-30 -6 -40 -30 -20 -48 c4 20 20 22 20 48z" fill="${a}"/><path d="M100 70 c30 -6 40 -30 20 -48 c-4 20 -20 22 -20 48z" fill="${a}"/>`,
  drop: (f, a) => `<path d="M100 20 C130 70 160 100 160 130 a60 60 0 0 1 -120 0 C40 100 70 70 100 20z" fill="${f}"/><path d="M70 136 a30 30 0 0 0 30 30" stroke="${a}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  sprout: (f, a) => `<path d="M100 180 V100" stroke="${f}" stroke-width="12" stroke-linecap="round"/><path d="M100 110 C60 110 40 80 40 50 C80 50 100 76 100 110z" fill="${f}"/><path d="M100 96 C140 96 160 66 160 36 C120 36 100 62 100 96z" fill="${a}"/><rect x="40" y="174" width="120" height="10" rx="5" fill="${f}"/>`,
  brackets: (f, a) => `<path d="M70 50 L30 100 L70 150 M130 50 L170 100 L130 150" stroke="${f}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M112 40 L88 160" stroke="${a}" stroke-width="14" stroke-linecap="round"/>`,
  moon: (f, a) => `<path d="M130 30 A76 76 0 1 0 170 140 A60 60 0 1 1 130 30z" fill="${f}"/><circle cx="150" cy="66" r="6" fill="${a}"/><circle cx="168" cy="96" r="4" fill="${a}"/>`,
  kitten: (f, a) => `<path d="M40 170 V80 L60 30 L84 66 h32 L140 30 L160 80 V170z" fill="${f}"/><circle cx="78" cy="110" r="9" fill="${a}"/><circle cx="122" cy="110" r="9" fill="${a}"/><path d="M92 134 l8 8 l8 -8" stroke="${a}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  chairs: (f, a) => `<path d="M30 60 V170 M30 120 H80 V170" stroke="${f}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M170 60 V170 M170 120 H120 V170" stroke="${f}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="100" cy="76" r="18" fill="${a}"/>`,
  bay: (f, a) => `<circle cx="100" cy="100" r="76" fill="${f}"/><path d="M24 110 c20 -10 40 10 60 0 s40 10 60 0 s30 8 32 0 V140 a76 76 0 0 1 -152 0z" fill="${a}"/><path d="M60 92 L100 50 L140 92z" fill="${a}"/>`,
  leaves3: (f, a) => `<path d="M100 170 C40 150 40 80 100 30 C160 80 160 150 100 170z" fill="${f}"/><path d="M100 160 V60 M100 100 L74 80 M100 124 L128 100" stroke="${a}" stroke-width="7" stroke-linecap="round"/>`,
  fern: (f, a) => `<path d="M100 180 C100 120 110 70 150 30" stroke="${f}" stroke-width="8" fill="none" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${106 + i * 9}" cy="${150 - i * 26}" rx="26" ry="8" transform="rotate(-${20 + i * 6} ${106 + i * 9} ${150 - i * 26})" fill="${i % 2 ? a : f}"/>`).join("")}`,
  kestrel: (f, a) => `<path d="M100 60 L20 40 L70 90 L100 170 L130 90 L180 40z" fill="${f}"/><circle cx="100" cy="72" r="14" fill="${a}"/>`,
  cross: (f, a) => `<rect x="70" y="24" width="60" height="152" rx="12" fill="${f}"/><rect x="24" y="70" width="152" height="60" rx="12" fill="${f}"/><circle cx="100" cy="100" r="18" fill="${a}"/>`,
  lintel: (f, a) => `<rect x="20" y="40" width="160" height="26" rx="4" fill="${a}"/><rect x="34" y="66" width="26" height="110" fill="${f}"/><rect x="140" y="66" width="26" height="110" fill="${f}"/><path d="M76 176 V110 a24 24 0 0 1 48 0 V176" fill="${f}" opacity=".5"/>`,
  wren: (f, a) => `<ellipse cx="96" cy="110" rx="62" ry="46" fill="${f}"/><circle cx="140" cy="80" r="28" fill="${f}"/><path d="M164 80 l20 6 l-20 6z" fill="${a}"/><path d="M40 100 L14 60 L56 84z" fill="${f}"/><circle cx="146" cy="76" r="5" fill="${a}"/><path d="M80 156 v18 M110 156 v18" stroke="${a}" stroke-width="6" stroke-linecap="round"/>`,
  sail: (f, a) => `<path d="M100 20 V150 H40z" fill="${f}"/><path d="M110 40 V150 H170z" fill="${a}"/><path d="M20 160 h160 l-20 22 h-120z" fill="${f}"/>`,
}
// [bg, fg, accent, symbol, line1 style, line2 style, line1, line2]
const W = (font, size, color, extra = "") => `font:${font};font-size:${size}px;color:${color};${extra}`
const MORE = {
  16: ["#ffffff", "#c2410c", "#16a34a", "van", W("800 0 Rubik", 46, "#c2410c", "letter-spacing:2px"), W("700 0 Rubik", 24, "#16a34a", "letter-spacing:8px"), "EASTGATE", "FOOD RESCUE"],
  17: ["#334155", "#e2e8f0", "#f59e0b", "keystone", W("700 0 'Playfair Display'", 48, "#fff"), W("600 0 Montserrat", 17, "#f59e0b", "letter-spacing:6px"), "Keystone", "HOUSING COLLABORATIVE"],
  18: ["#fefce8", "#166534", "#eab308", "pencil", W("700 0 'Josefin Sans'", 48, "#166534", "letter-spacing:3px"), W("700 0 'Josefin Sans'", 26, "#a16207", "letter-spacing:10px"), "PINE STREET", "TUTORING"],
  19: ["#0c4a6e", "#bae6fd", "#7dd3fc", "heron", W("700 0 Lora", 50, "#fff"), W("600 0 Montserrat", 17, "#7dd3fc", "letter-spacing:5px"), "Blue Heron", "WATERSHED ALLIANCE"],
  20: ["#1c1917", "#fbbf24", "#fff7ed", "lantern", W("800 0 Raleway", 46, "#fbbf24", "letter-spacing:6px"), W("500 0 'Work Sans'", 22, "#fff7ed", "letter-spacing:6px"), "LANTERN", "literacy project"],
  21: ["#fff1e6", "#9a3412", "#f97316", "hearth", W("700 0 Fraunces", 50, "#9a3412"), W("600 0 Montserrat", 20, "#c2410c", "letter-spacing:9px"), "Hearth & Home", "SHELTER"],
  22: ["#ecfeff", "#155e75", "#0891b2", "bird", W("700 0 'Barlow Condensed'", 56, "#155e75", "letter-spacing:4px"), W("600 0 Montserrat", 19, "#0891b2", "letter-spacing:7px"), "SALTMARSH", "WILDLIFE RESCUE"],
  23: ["#111827", "#f472b6", "#facc15", "note", W("700 0 'Space Grotesk'", 46, "#fff", "letter-spacing:1px"), W("700 0 'Space Grotesk'", 26, "#f472b6", "letter-spacing:4px"), "SOUTHSIDE", "music lab"],
  24: ["#7c2d12", "#fed7aa", "#fb923c", "table", W("400 0 'DM Serif Display'", 52, "#fff"), W("600 0 Montserrat", 17, "#fed7aa", "letter-spacing:5px"), "Shared Table", "REFUGEE KITCHEN"],
  25: ["#f0fdf4", "#15803d", "#86efac", "path", W("700 0 Quicksand", 48, "#15803d"), W("500 0 Quicksand", 22, "#166534", "letter-spacing:5px"), "steady path", "recovery peers"],
  26: ["#ffffff", "#65a30d", "#92400e", "oak", W("800 0 Nunito", 52, "#4d7c0f"), W("700 0 Nunito", 24, "#92400e", "letter-spacing:3px"), "little oak", "early learning"],
  27: ["#e0f2fe", "#0369a1", "#f59e0b", "tooth", W("800 0 Montserrat", 40, "#0369a1", "letter-spacing:2px"), W("600 0 Montserrat", 22, "#0369a1", "letter-spacing:7px"), "MOBILE DENTAL", "NEIGHBORS"],
  28: ["#a16207", "#fef3c7", "#fde68a", "wheat", W("600 0 Oswald", 52, "#fff", "letter-spacing:4px"), W("600 0 Montserrat", 20, "#fef3c7", "letter-spacing:8px"), "PRAIRIE WIND", "FOOD BANK"],
  29: ["#4c0519", "#fda4af", "#fde047", "masks", W("700 0 'Playfair Display'", 50, "#fff"), W("600 0 Montserrat", 17, "#fda4af", "letter-spacing:6px"), "Old Mill", "COMMUNITY THEATER"],
  30: ["#ffffff", "#0f766e", "#f59e0b", "gate", W("800 0 Archivo", 48, "#0f766e", "letter-spacing:4px"), W("500 0 'Work Sans'", 21, "#0f766e", "letter-spacing:6px"), "OPEN GATE", "youth shelter"],
  31: ["#fdf2f8", "#be185d", "#f472b6", "bowl", W("700 0 Lora", 50, "#9d174d"), W("600 0 Montserrat", 19, "#be185d", "letter-spacing:7px"), "Hilltop", "SENIOR MEALS"],
  32: ["#164e63", "#67e8f9", "#a5f3fc", "drop", W("700 0 'Barlow Condensed'", 54, "#fff", "letter-spacing:3px"), W("600 0 Montserrat", 19, "#67e8f9", "letter-spacing:7px"), "RIVERBANK", "CLEANUP CREW"],
  33: ["#f7fee7", "#3f6212", "#ca8a04", "sprout", W("700 0 Fraunces", 52, "#3f6212"), W("600 0 Montserrat", 19, "#a16207", "letter-spacing:7px"), "Seedline", "GROWERS COLLECTIVE"],
  34: ["#1e1b4b", "#a5b4fc", "#fbbf24", "brackets", W("700 0 'Space Grotesk'", 46, "#fff"), W("500 0 'Space Grotesk'", 24, "#a5b4fc", "letter-spacing:4px"), "bright lines", "coding club"],
  35: ["#f5f3ff", "#5b21b6", "#c4b5fd", "moon", W("600 0 'Cormorant Garamond'", 50, "#4c1d95", "letter-spacing:2px"), W("600 0 Montserrat", 17, "#6d28d9", "letter-spacing:6px"), "Quiet Hours", "HOSPICE VOLUNTEERS"],
  36: ["#fb923c", "#fff", "#7c2d12", "kitten", W("700 0 Caveat", 58, "#fff"), W("800 0 Montserrat", 20, "#7c2d12", "letter-spacing:6px"), "Foster Kitten", "NETWORK"],
  37: ["#fffbeb", "#78350f", "#d97706", "chairs", W("700 0 'Libre Baskerville'", 40, "#78350f"), W("600 0 Montserrat", 19, "#b45309", "letter-spacing:8px"), "Kitchen Table", "COUNSELING"],
  38: [NAVY, "#38bdf8", GOLD, "bay", W("700 0 'Cormorant Garamond'", 52, "#fff", "letter-spacing:6px"), W("600 0 Montserrat", 17, GOLD, "letter-spacing:6px"), "BAYSIDE", "NEIGHBORS FUND"],
  39: ["#1e3a5f", "#fff", GOLD, "leaves3", W("700 0 'Libre Baskerville'", 50, "#fff"), W("600 0 Montserrat", 17, GOLD, "letter-spacing:6px"), "Alder", "FAMILY FOUNDATION"],
  40: [NAVY, "#86efac", GOLD, "fern", W("700 0 'Playfair Display'", 50, "#fff"), W("600 0 Montserrat", 16, GOLD, "letter-spacing:5px"), "Fernhill", "ENVIRONMENTAL TRUST"],
  41: ["#172554", GOLD, "#fff", "kestrel", W("800 0 Raleway", 50, "#fff", "letter-spacing:8px"), W("600 0 Montserrat", 18, GOLD, "letter-spacing:8px"), "KESTREL", "YOUTH FUND"],
  42: [NAVY, "#fff", GOLD, "cross", W("700 0 'Cormorant Garamond'", 50, "#fff", "letter-spacing:4px"), W("600 0 Montserrat", 17, GOLD, "letter-spacing:7px"), "BELLWEATHER", "HEALTH TRUST"],
  43: ["#1f2a44", "#cbd5e1", GOLD, "lintel", W("700 0 Fraunces", 54, "#fff"), W("600 0 Montserrat", 17, GOLD, "letter-spacing:7px"), "Lintel", "HOUSING FUND"],
  44: [NAVY, "#e2e8f0", GOLD, "wren", W("700 0 Lora", 52, "#fff"), W("600 0 Montserrat", 18, GOLD, "letter-spacing:7px"), "Wrenfield", "FOUNDATION"],
  45: ["#0b2545", "#fff", GOLD, "sail", W("700 0 'Cormorant Garamond'", 52, "#fff", "letter-spacing:6px"), W("600 0 Montserrat", 16, GOLD, "letter-spacing:5px"), "SALTWIND", "COMMUNITY FOUNDATION"],
}
for (const [n, [bg, f, a, sym, s1, s2, l1, l2]] of Object.entries(MORE)) {
  LOGOS[n] = [bg, S[sym](f, a), `<div style="${s1}">${l1}</div><div style="${s2};margin-top:2px">${l2}</div>`]
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
