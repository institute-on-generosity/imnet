// Hand-written row shapes for Phase I. Replace with `npm run db:types` output once linked.

export type PostKind = "update" | "impact_story" | "ask"
export type OrgType = "nonprofit" | "foundation"

export type OrgSummary = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  org_type: OrgType
}

export type Org = OrgSummary & {
  ein: string | null
  website: string | null
  mission: string | null
  what_gifts_fund: string | null
  everyorg_slug: string | null
  status: "pending" | "verified" | "suspended"
}

export type Post = {
  id: string
  org_id: string
  kind: PostKind
  body: string
  embed_url: string | null
  embed_credit: string | null
  video_path: string | null
  video_poster_path: string | null
  video_alt: string | null
  video_credit: string | null
  image_paths: string[]
  image_alts: string[]
  image_credits: string[]
  created_at: string
  org: OrgSummary
  // Set when this post is a grantee's report on a confirmed grant (hidden if the grant isn't visible).
  report_grant: ReportGrant | null
}

export type ReportGrant = { id: string; amount_usd: number | null; purpose: string | null; foundation: OrgSummary }
export type GrantReport = { id: string; body: string; created_at: string }

export type ImpactStat = {
  id: string
  label: string
  value: string
  source_url: string
  as_of: string | null
}

export type Cause = { slug: string; name: string }

export const ORG_TYPE_LABEL: Record<OrgType, string> = { nonprofit: "Nonprofit", foundation: "Foundation" }

export const POST_KIND_LABEL: Record<PostKind, string> = {
  update: "Update",
  impact_story: "Impact story",
  ask: "Ask",
}

// A foundation's grant to a nonprofit. Public only once the nonprofit confirms it.
export type Grant = {
  id: string
  post_id: string | null
  amount_usd: number | null
  purpose: string | null
  awarded_on: string
  confirmed_at: string | null
  foundation: OrgSummary
  grantee: OrgSummary
  reports: GrantReport[]
}

