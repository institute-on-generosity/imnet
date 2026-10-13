import { escapeLike } from "@/lib/search"
import { createClient } from "@/lib/supabase/server"
import type { Cause, Grant, ImpactStat, Org, OrgSummary, OrgType, Post } from "@/lib/types"

const PAGE_SIZE = 20
const POST_FIELDS = `id, org_id, kind, body, embed_url, embed_credit, video_path, video_poster_path, video_alt, video_credit, image_paths, image_alts, image_credits, created_at,
  report_grant:grants!posts_reports_grant_id_fkey(id, amount_usd, purpose, foundation:orgs!grants_foundation_id_fkey(id, slug, name, logo_url, org_type))`

// Chronological, no engagement ranking (design principle #4).
export async function getFeed(opts: { cause?: string; orgIds?: string[]; orgType?: OrgType } = {}): Promise<Post[]> {
  const supabase = await createClient()
  const orgJoin = opts.cause
    ? "org:orgs!inner(id, slug, name, logo_url, org_type, org_causes!inner(cause_slug))"
    : "org:orgs!inner(id, slug, name, logo_url, org_type)"

  let query = supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${orgJoin}`)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)

  if (opts.cause) query = query.eq("org.org_causes.cause_slug", opts.cause)
  if (opts.orgIds) query = query.in("org_id", opts.orgIds)
  if (opts.orgType) query = query.eq("org.org_type", opts.orgType)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Post[]
}

export async function getCauses(): Promise<Cause[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("causes").select("slug, name").order("name")
  return data ?? []
}

export async function getOrgBySlug(slug: string) {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from("orgs")
    .select("id, slug, name, ein, website, mission, what_gifts_fund, logo_url, everyorg_slug, status, org_type")
    .eq("slug", slug)
    .maybeSingle<Org>()
  if (!org) return null

  const [{ data: stats }, { data: causes }, { data: followers }] = await Promise.all([
    supabase
      .from("impact_stats")
      .select("id, label, value, source_url, as_of")
      .eq("org_id", org.id)
      .order("sort"),
    supabase.from("org_causes").select("cause:causes(slug, name)").eq("org_id", org.id),
    supabase.rpc("follower_count", { target: org.id }),
  ])

  return {
    org,
    stats: (stats ?? []) as ImpactStat[],
    causes: ((causes ?? []) as unknown as { cause: Cause }[]).map((c) => c.cause),
    followers: Number(followers ?? 0),
  }
}

export async function getPost(id: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select(`${POST_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type)`)
    .eq("id", id)
    .maybeSingle()
  return data as unknown as Post | null
}

export async function getFollowedOrgIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("follows").select("org_id").eq("user_id", userId)
  return (data ?? []).map((f) => f.org_id)
}

export function postVideoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-videos/${path}`
}

export function postImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`
}

// Last-30-day engagement for an org's dashboard (RLS limits this to its staff).
export async function getOrgEventCounts(orgId: string) {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data } = await supabase.from("events").select("type").eq("org_id", orgId).gte("created_at", since)
  const counts: Record<string, number> = { view: 0, share: 0, donate_click: 0 }
  for (const e of data ?? []) counts[e.type] = (counts[e.type] ?? 0) + 1
  return counts
}

// ---------------------------------------------------------------------------
// LinkedIn-style sidebars and search
// ---------------------------------------------------------------------------
export type Viewer = {
  id: string
  handle: string
  display_name: string | null
  following: number
  causes: Cause[]
}

export async function getViewer(userId: string | null): Promise<Viewer | null> {
  if (!userId) return null
  const supabase = await createClient()
  const [{ data: profile }, { count }, { data: causes }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name").eq("id", userId).single(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("profile_causes").select("cause:causes(slug, name)").eq("user_id", userId),
  ])
  if (!profile) return null
  return {
    ...profile,
    following: count ?? 0,
    causes: ((causes ?? []) as unknown as { cause: Cause }[]).map((c) => c.cause),
  }
}

// Orgs to follow: verified, not already followed, optionally within one cause.
// Alphabetical, not popularity-ranked (design principle #4).
export async function getSuggestedOrgs(opts: { userId?: string | null; cause?: string; excludeId?: string; limit?: number } = {}) {
  const supabase = await createClient()
  const followed = opts.userId ? await getFollowedOrgIds(opts.userId) : []
  const exclude = [...followed, ...(opts.excludeId ? [opts.excludeId] : [])]

  let query = supabase
    .from("orgs")
    .select(opts.cause ? "id, slug, name, logo_url, org_type, mission, org_causes!inner(cause_slug)" : "id, slug, name, logo_url, org_type, mission")
    .eq("status", "verified")
    .order("name")
    .limit(opts.limit ?? 5)
  if (opts.cause) query = query.eq("org_causes.cause_slug", opts.cause)
  if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`)

  const { data } = await query
  return (data ?? []) as unknown as (OrgSummaryWithMission)[]
}

export type OrgSummaryWithMission = OrgSummary & { mission: string | null }

export async function getMovedPostIds(userId: string | null, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from("moved").select("post_id").eq("user_id", userId).in("post_id", postIds)
  return new Set((data ?? []).map((m) => m.post_id))
}

export async function searchOrgs(q: string): Promise<OrgSummaryWithMission[]> {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const supabase = await createClient()
  const escaped = escapeLike(term)
  const { data } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_url, org_type, mission")
    .eq("status", "verified")
    .ilike("name", `%${escaped}%`)
    .order("name")
    .limit(20)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Grants (RLS shows confirmed grants to everyone, unconfirmed ones only to the two orgs' staff)
// ---------------------------------------------------------------------------
const GRANT_FIELDS = `id, post_id, amount_usd, purpose, awarded_on, confirmed_at,
  foundation:orgs!grants_foundation_id_fkey(id, slug, name, logo_url, org_type),
  grantee:orgs!grants_grantee_id_fkey(id, slug, name, logo_url, org_type),
  reports:posts!posts_reports_grant_id_fkey(id, body, created_at)`

export async function getGrantsForPosts(postIds: string[]): Promise<Map<string, Grant[]>> {
  const byPost = new Map<string, Grant[]>()
  if (postIds.length === 0) return byPost
  const supabase = await createClient()
  const { data } = await supabase.from("grants").select(GRANT_FIELDS).in("post_id", postIds).order("amount_usd", { ascending: false, nullsFirst: false })
  for (const g of (data ?? []) as unknown as Grant[]) {
    const list = byPost.get(g.post_id!) ?? []
    list.push(g)
    byPost.set(g.post_id!, list)
  }
  return byPost
}

// Funded-by (nonprofit) or grantees (foundation), confirmed only, newest first.
export async function getOrgGrants(org: Pick<Org, "id" | "org_type">): Promise<Grant[]> {
  const supabase = await createClient()
  const column = org.org_type === "foundation" ? "foundation_id" : "grantee_id"
  const { data } = await supabase
    .from("grants")
    .select(GRANT_FIELDS)
    .eq(column, org.id)
    .not("confirmed_at", "is", null)
    .order("awarded_on", { ascending: false })
  return (data ?? []) as unknown as Grant[]
}

export async function getGrantsToConfirm(orgId: string): Promise<Grant[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("grants")
    .select(GRANT_FIELDS)
    .eq("grantee_id", orgId)
    .is("confirmed_at", null)
    .order("created_at", { ascending: false })
  return (data ?? []) as unknown as Grant[]
}

// Confirmed grants this nonprofit received that it hasn't reported on yet (dashboard nudge).
export async function getGrantsNeedingReport(orgId: string): Promise<Grant[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("grants")
    .select(GRANT_FIELDS)
    .eq("grantee_id", orgId)
    .not("confirmed_at", "is", null)
    .order("awarded_on", { ascending: false })
  return ((data ?? []) as unknown as Grant[]).filter((g) => g.reports.length === 0)
}

// Confirmed grants a nonprofit can report on (composer picker).
export async function getReportableGrants(orgId: string): Promise<Grant[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("grants")
    .select(GRANT_FIELDS)
    .eq("grantee_id", orgId)
    .not("confirmed_at", "is", null)
    .order("awarded_on", { ascending: false })
  return (data ?? []) as unknown as Grant[]
}

