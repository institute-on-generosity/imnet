// F-109 Compare what someone typed when claiming an organization with its IRS record (via NomBot).
// Pure, so it's unit-tested; the admin sees the result next to each claim.

export type IrsOrg = {
  ein: string // "62-0646012"
  name: string
  city: string | null
  state: string | null
  subsection: string | null // "03" = 501(c)(3)
  ruling: string | null // year recognized as tax-exempt
  ntee: { code: string; label: string } | null
  mission: string | null
  filing: { year: number; form: string; url?: string } | null
  years: { year: number; revenue: number | null; expenses: number | null; assets: number | null; source: string }[]
  leaders: { name: string; title: string | null; pay: number | null; year: number }[]
  grantsReceived: { count: number; total: number; funders: number; latestYear: number | null }
  grantsGiven: { count: number; total: number; latestYear: number | null }
  nombotUrl: string
}

export type CheckLevel = "ok" | "warn" | "fail"
export type IrsCheck = { level: CheckLevel; label: string }

// "St. Jude Children's Research Hospital, Inc." and "ST JUDE CHILDRENS RESEARCH HOSPITAL INC" match.
const STOP = new Set(["inc", "incorporated", "corp", "corporation", "co", "llc", "ltd", "the", "of", "and", "a", "an", "for", "foundation", "fund", "trust", "org", "organization"])
export const nameTokens = (s: string) => new Set(s.toLowerCase().replace(/['’]/g, "").replace(/&/g, " and ").split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t)))
export function nameSimilarity(a: string, b: string) {
  const A = nameTokens(a), B = nameTokens(b)
  if (A.size === 0 || B.size === 0) return 0
  let both = 0
  for (const t of A) if (B.has(t)) both++
  return both / Math.max(A.size, B.size)
}

export const isFoundationRecord = (o: Pick<IrsOrg, "filing" | "grantsGiven">) => o.filing?.form === "990PF" || o.filing?.form === "990-PF" || o.grantsGiven.count > 0

export function checkClaim(claim: { org_name: string; org_type: "nonprofit" | "foundation" }, irs: IrsOrg | null): IrsCheck[] {
  if (!irs) return [{ level: "fail", label: "No IRS record for this EIN" }]
  const checks: IrsCheck[] = []
  const sim = nameSimilarity(claim.org_name, irs.name)
  checks.push(sim >= 0.6 ? { level: "ok", label: `Name matches IRS record (${irs.name})` } : sim >= 0.3 ? { level: "warn", label: `Name partly matches IRS record (${irs.name})` } : { level: "fail", label: `Name doesn't match IRS record (${irs.name})` })
  checks.push(irs.subsection === "03" ? { level: "ok", label: `501(c)(3) tax-exempt${irs.ruling ? ` since ${irs.ruling}` : ""}` } : irs.subsection ? { level: "warn", label: `Tax-exempt under 501(c)(${Number(irs.subsection)}), not 501(c)(3)` } : { level: "warn", label: "Tax-exempt status not listed" })
  if (claim.org_type === "foundation" && !isFoundationRecord(irs)) checks.push({ level: "warn", label: "Claimed as a foundation, but no 990-PF or grants on file" })
  if (claim.org_type === "nonprofit" && irs.filing?.form?.replace("-", "") === "990PF") checks.push({ level: "warn", label: "Claimed as a nonprofit, but it files a 990-PF (private foundation)" })
  const latest = irs.filing?.year ?? irs.years[0]?.year
  checks.push(latest && latest >= new Date().getFullYear() - 3 ? { level: "ok", label: `Filed recently (${latest})` } : { level: "warn", label: latest ? `Last filing on record: ${latest}` : "No recent filing on record" })
  return checks
}

export const overall = (checks: IrsCheck[]): CheckLevel => (checks.some((c) => c.level === "fail") ? "fail" : checks.some((c) => c.level === "warn") ? "warn" : "ok")

// IRS names are upper case; show them like people write them.
const UPPER = new Set(["llc", "usa", "us", "ymca", "ywca", "ceo", "cfo", "coo", "cto", "cmo", "evp", "svp", "vp", "ed", "md", "phd", "rn", "ii", "iii", "iv", "ny", "dc", "la"])
export function displayName(s: string) {
  return s.toLowerCase().replace(/[a-z]+/g, (w) => (UPPER.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
}
