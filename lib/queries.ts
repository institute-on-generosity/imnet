import { escapeLike } from "@/lib/search"
import { createClient } from "@/lib/supabase/server"
import type { Cause, ImpactStat, Org, Post } from "@/lib/types"

const PAGE_SIZE = 20
const POST_FIELDS = "id, org_id, kind, body, embed_url, image_paths, created_at"

// Chronological, no engagement ranking (design principle #4).
export async function getFeed(opts: { cause?: string; orgIds?: string[] } = {}): Promise<Post[]> {
  const supabase = await createClient()
  const orgJoin = opts.cause
    ? "org:orgs!inner(id, slug, name, logo_url, org_causes!inner(cause_slug))"
    : "org:orgs!inner(id, slug, name, logo_url)"

  let query = supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${orgJoin}`)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)

  if (opts.cause) query = query.eq("org.org_causes.cause_slug", opts.cause)
  if (opts.orgIds) query = query.in("org_id", opts.orgIds)

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
    .select("id, slug, name, ein, website, mission, what_gifts_fund, logo_url, everyorg_slug, status")
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
    .select(`${POST_FIELDS}, org:orgs!inner(id, slug, name, logo_url)`)
    .eq("id", id)
    .maybeSingle()
  return data as unknown as Post | null
}

export async function getFollowedOrgIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("follows").select("org_id").eq("user_id", userId)
  return (data ?? []).map((f) => f.org_id)
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
    .select(opts.cause ? "id, slug, name, logo_url, mission, org_causes!inner(cause_slug)" : "id, slug, name, logo_url, mission")
    .eq("status", "verified")
    .order("name")
    .limit(opts.limit ?? 5)
  if (opts.cause) query = query.eq("org_causes.cause_slug", opts.cause)
  if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`)

  const { data } = await query
  return (data ?? []) as unknown as (OrgSummaryWithMission)[]
}

export type OrgSummaryWithMission = { id: string; slug: string; name: string; logo_url: string | null; mission: string | null }

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
    .select("id, slug, name, logo_url, mission")
    .eq("status", "verified")
    .ilike("name", `%${escaped}%`)
    .order("name")
    .limit(20)
  return data ?? []
}
