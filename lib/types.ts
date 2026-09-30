// Hand-written row shapes for Phase I. Replace with `npm run db:types` output once linked.

export type PostKind = "update" | "impact_story" | "ask"

export type OrgSummary = {
  id: string
  slug: string
  name: string
  logo_url: string | null
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
  image_paths: string[]
  created_at: string
  org: OrgSummary
}

export type ImpactStat = {
  id: string
  label: string
  value: string
  source_url: string
  as_of: string | null
}

export type Cause = { slug: string; name: string }

export const POST_KIND_LABEL: Record<PostKind, string> = {
  update: "Update",
  impact_story: "Impact story",
  ask: "Ask",
}
