// Giving journal: checks for a logged gift and the private totals shown to the donor.
export type GiftFields = { org_id: string; amount_usd: number; given_on: string; note: string | null }
export type Gift = { id: string; amount_usd: number; given_on: string; note: string | null; org: { id: string; slug: string; name: string } }

export function parseGiftFields(input: { orgId: string; amount: string; givenOn: string; note: string }, today: string): { error: string } | { fields: GiftFields } {
  if (!/^[0-9a-f-]{36}$/.test(input.orgId)) return { error: "Pick an organization." }
  const amount = Number(input.amount.replace(/[$,\s]/g, ""))
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return { error: "Enter a whole-dollar amount, like 50." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.givenOn) || input.givenOn > today) return { error: "Pick the date you gave (not in the future)." }
  const note = input.note.trim()
  if (note.length > 300) return { error: "Keep the note under 300 characters." }
  return { fields: { org_id: input.orgId, amount_usd: amount, given_on: input.givenOn, note: note || null } }
}

// Totals by year (newest first) and by organization within the newest year.
export function summarize(gifts: Gift[]) {
  const years = new Map<string, number>()
  for (const g of gifts) years.set(g.given_on.slice(0, 4), (years.get(g.given_on.slice(0, 4)) ?? 0) + g.amount_usd)
  return [...years].sort((a, b) => b[0].localeCompare(a[0])).map(([year, total]) => {
    const byOrg = new Map<string, { name: string; slug: string; total: number }>()
    for (const g of gifts.filter((g) => g.given_on.startsWith(year))) {
      const o = byOrg.get(g.org.id) ?? { name: g.org.name, slug: g.org.slug, total: 0 }
      o.total += g.amount_usd
      byOrg.set(g.org.id, o)
    }
    return { year, total, orgs: [...byOrg.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)) }
  })
}
