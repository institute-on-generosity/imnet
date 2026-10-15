// B-035 optical alignment audit: measures the rendered ink (icon paths, text glyphs) of every boxed
// button on the main pages and lists styles whose visual padding differs by more than 1px.
// Usage: node scripts/optical-audit.mjs _ <open-call-post-id>  (dev server on :3100, DEV_LOGIN set)
import { chromium } from "@playwright/test"
const POST = process.argv[3]
const b = await chromium.launch({ channel: "chrome" })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto("http://localhost:3100/login"); await p.getByRole("button", { name: /Continue as/ }).click(); await p.waitForURL((u) => !u.pathname.startsWith("/login"))
const pages = ["/", "/following", "/following?tab=orgs", "/notifications", "/calls", "/needs", "/events", "/u/hunter", "/o/harbor-table", `/p/${POST}`, "/saved", "/giving", "/search?q=food", "/dashboard", "/settings/profile"]
const seen = new Map()
for (const path of pages) {
  await p.goto("http://localhost:3100" + path); await p.waitForLoadState("networkidle")
  const rows = await p.evaluate(() => {
    const out = []
    const ctx = document.createElement("canvas").getContext("2d")
    for (const el of document.querySelectorAll("button, a, [role=tab]")) {
      const r = el.getBoundingClientRect(); if (!r.width || r.height > 44 || r.height < 16) continue
      const cs = getComputedStyle(el)
      const boxed = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderLeftWidth) > 0
      if (!boxed) continue
      const svgs = [...el.querySelectorAll("svg")].filter((s) => s.getBoundingClientRect().width > 0)
      // ink rects
      const inks = []
      for (const s of svgs) {
        const sr = s.getBoundingClientRect(), vb = s.viewBox.baseVal, k = sr.width / (vb?.width || sr.width)
        let bb; try { bb = s.getBBox() } catch { continue }
        const sw = 2 * k / 2 // half stroke
        inks.push({ t: "svg", l: sr.left + (bb.x - (vb?.x || 0)) * k - sw, r: sr.left + (bb.x + bb.width - (vb?.x || 0)) * k + sw, top: sr.top + (bb.y - (vb?.y || 0)) * k - sw, bot: sr.top + (bb.y + bb.height - (vb?.y || 0)) * k + sw })
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let n; while ((n = walker.nextNode())) {
        const txt = n.textContent; if (!txt.trim()) continue
        const pe = n.parentElement; if (pe.closest(".sr-only")) continue
        const range = document.createRange(); range.selectNodeContents(n)
        const rr = range.getBoundingClientRect(); if (!rr.width) continue
        const pcs = getComputedStyle(pe); ctx.font = `${pcs.fontWeight} ${pcs.fontSize} ${pcs.fontFamily}`
        const m = ctx.measureText(txt.trim())
        // horizontal ink from side bearings
        const lead = txt.length - txt.trimStart().length
        const l = rr.left + (lead ? ctx.measureText(txt.slice(0, lead)).width : 0) + m.actualBoundingBoxLeft * -1
        const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
        // vertical: baseline approx via font metrics within line box
        const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent
        const half = (rr.height - (asc + desc)) / 2, base = rr.top + half + asc
        const cap = ctx.measureText("H").actualBoundingBoxAscent
        inks.push({ t: "txt", l, r: l + w, top: base - cap, bot: base })
      }
      if (!inks.length) continue
      const L = Math.min(...inks.map((i) => i.l)) - r.left, R = r.right - Math.max(...inks.map((i) => i.r))
      const T = Math.min(...inks.map((i) => i.top)) - r.top, B = r.bottom - Math.max(...inks.map((i) => i.bot))
      const label = (el.getAttribute("aria-label") || el.textContent).trim().replace(/\s+/g, " ").slice(0, 40)
      const shape = (svgs.length ? (inks[0].t === "svg" ? "icon+text" : inks.at(-1).t === "svg" ? "text+icon" : "mixed") : "text")
      out.push({ label, shape, L: +L.toFixed(1), R: +R.toFixed(1), T: +T.toFixed(1), B: +B.toFixed(1), cls: String(el.className).slice(0, 140), h: Math.round(r.height) })
    }
    return out
  })
  for (const row of rows) {
    const key = row.cls + "|" + row.shape
    if (!seen.has(key)) seen.set(key, { ...row, path })
  }
}
const bad = [...seen.values()].filter((r) => Math.abs(r.L - r.R) > 1 || Math.abs(r.T - r.B) > 1)
bad.sort((a, b) => Math.max(Math.abs(b.L - b.R), Math.abs(b.T - b.B)) - Math.max(Math.abs(a.L - a.R), Math.abs(a.T - a.B)))
console.log(`checked ${seen.size} distinct button styles, ${bad.length} off by >1px`)
for (const r of bad) console.log(`${r.path} | ${r.label} | ${r.shape} h${r.h} | L${r.L} R${r.R} | T${r.T} B${r.B}\n    ${r.cls}`)
await b.close()
