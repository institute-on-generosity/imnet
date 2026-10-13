import type { Grant } from "@/lib/types"

export const MAX_GRANTS_PER_POST = 10

export const formatUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M` : `$${n.toLocaleString("en-US")}`

// Confirmed grant totals for a profile header ("$43,000 to 2 nonprofits").
export function grantTotals(grants: Pick<Grant, "amount_usd" | "grantee" | "foundation">[], side: "grantee" | "foundation") {
  const orgs = new Set(grants.map((g) => (side === "grantee" ? g.grantee.id : g.foundation.id)))
  const total = grants.reduce((sum, g) => sum + (g.amount_usd ?? 0), 0)
  return { count: orgs.size, total }
}

type GrantInput = { grantee_id: string; amount_usd: number | null; purpose: string | null }

// Parses the composer's grant fields (parallel arrays). Server-side; the DB re-checks types.
export function parseGrantFields(ids: string[], amounts: string[], purposes: string[]): { error: string } | { grants: GrantInput[] } {
  if (ids.length > MAX_GRANTS_PER_POST) return { error: `Tag up to ${MAX_GRANTS_PER_POST} grantees per post.` }
  if (new Set(ids).size !== ids.length) return { error: "Each grantee can be tagged once per post." }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  const grants: GrantInput[] = []
  for (let i = 0; i < ids.length; i++) {
    if (!uuid.test(ids[i])) return { error: "Pick grantees from the list." }
    const raw = (amounts[i] ?? "").replace(/[$,\s]/g, "")
    const amount = raw === "" ? null : Number(raw)
    if (amount !== null && (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000_000)) {
      return { error: "Grant amounts are whole dollars, like 25000." }
    }
    const purpose = (purposes[i] ?? "").trim()
    if (purpose.length > 200) return { error: "Keep each grant purpose under 200 characters." }
    grants.push({ grantee_id: ids[i], amount_usd: amount, purpose: purpose || null })
  }
  return { grants }
}

// Foundations backing a nonprofit (from its confirmed grants), largest total first.
export function backers(grants: Pick<Grant, "amount_usd" | "foundation">[]) {
  const byId = new Map<string, { foundation: Grant["foundation"]; total: number }>()
  for (const g of grants) {
    const entry = byId.get(g.foundation.id) ?? { foundation: g.foundation, total: 0 }
    entry.total += g.amount_usd ?? 0
    byId.set(g.foundation.id, entry)
  }
  return [...byId.values()].sort((a, b) => b.total - a.total || a.foundation.name.localeCompare(b.foundation.name)).map((e) => e.foundation)
}

// "Backed by Lakeshore" / "Co-funded by Lakeshore and Riverside" / "Co-funded by Lakeshore and 2 other foundations"
export function backersLabel(names: string[]) {
  if (names.length === 0) return ""
  if (names.length === 1) return `Backed by ${names[0]}`
  if (names.length === 2) return `Co-funded by ${names[0]} and ${names[1]}`
  return `Co-funded by ${names[0]} and ${names.length - 1} other foundations`
}

