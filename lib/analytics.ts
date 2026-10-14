// Turns per-day totals into a complete series (days with nothing are zero), oldest first.
export type DayRow = { day: string; type: string; n: number }
export type Series = { day: string; view: number; share: number; donate_click: number }[]

export function fillDays(rows: DayRow[], days: number, today: string): Series {
  const out: Series = []
  const end = Date.parse(`${today}T00:00:00Z`)
  for (let i = days - 1; i >= 0; i--) out.push({ day: new Date(end - i * 86_400_000).toISOString().slice(0, 10), view: 0, share: 0, donate_click: 0 })
  const byDay = new Map(out.map((d) => [d.day, d]))
  for (const r of rows) {
    const d = byDay.get(r.day)
    if (d && (r.type === "view" || r.type === "share" || r.type === "donate_click")) d[r.type] += Number(r.n)
  }
  return out
}

export const total = (s: Series, k: "view" | "share" | "donate_click") => s.reduce((a, d) => a + d[k], 0)
