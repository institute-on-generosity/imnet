import { cache } from "react"
import { type Cursor, encodeCursor, olderThan } from "@/lib/cursor"
import { type DayRow, fillDays, type Series, total } from "@/lib/analytics"
import type { Comment } from "@/lib/comments"
import type { EventWithOrg, OrgEvent } from "@/lib/events"
import type { Gift } from "@/lib/gifts"
import { MET_SHOWN_DAYS, type Need, type NeedWithOrg } from "@/lib/needs"
import { escapeLike, orFilterTerm, wordStartPattern } from "@/lib/search"
import { createClient } from "@/lib/supabase/server"
import type { Cause, Grant, ImpactStat, Org, OrgSummary, OrgType, Post } from "@/lib/types"

const PAGE_SIZE = 20
const POST_FIELDS = `id, org_id, kind, body, embed_url, embed_credit, video_path, video_poster_path, video_alt, video_credit, image_paths, image_alts, image_credits, created_at, edited_at, call_deadline, call_apply_url, call_max_award, call_causes,
  report_grant:grants!posts_reports_grant_id_fkey(id, amount_usd, purpose, foundation:orgs!grants_foundation_id_fkey(id, slug, name, logo_url, org_type))`

type FeedOpts = { cause?: string; orgIds?: string[]; orgType?: OrgType; reportGrantIds?: string[]; before?: Cursor }

// Chronological, no engagement ranking (design principle #4). One page plus a cursor for the next.
// reportGrantIds: also include grant reports on these grants (portfolio of followed foundations).
export async function getFeedPage(opts: FeedOpts = {}): Promise<{ posts: Post[]; next: string | null }> {
  const supabase = await createClient()
  const orgJoin = opts.cause
    ? "org:orgs!inner(id, slug, name, logo_url, org_type, org_causes!inner(cause_slug))"
    : "org:orgs!inner(id, slug, name, logo_url, org_type)"

  let query = supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${orgJoin}`)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (opts.cause) query = query.eq("org.org_causes.cause_slug", opts.cause)
  if (opts.orgIds && opts.reportGrantIds?.length) {
    const orgs = opts.orgIds.length ? `org_id.in.(${opts.orgIds.join(",")}),` : ""
    query = query.or(`${orgs}reports_grant_id.in.(${opts.reportGrantIds.join(",")})`)
  } else if (opts.orgIds) query = query.in("org_id", opts.orgIds)
  if (opts.orgType) query = query.eq("org.org_type", opts.orgType)
  if (opts.before) query = query.or(olderThan(opts.before))

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as Post[]
  const posts = rows.slice(0, PAGE_SIZE)
  const last = posts.at(-1)
  return { posts, next: rows.length > PAGE_SIZE && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null }
}

export async function getFeed(opts: FeedOpts = {}): Promise<Post[]> {
  return (await getFeedPage(opts)).posts
}

// Cached per request: many components need cause names.
export const getCauses = cache(async (): Promise<Cause[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("causes").select("slug, name").order("name")
  return data ?? []
})

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
// 30-day totals for the dashboard, summed in the database (B-022: the API caps rows at 1,000).
export async function getOrgEventCounts(orgId: string) {
  const series = await getOrgDaily(orgId)
  return { view: total(series, "view"), share: total(series, "share"), donate_click: total(series, "donate_click") }
}

export async function getOrgDaily(orgId: string, days = 30): Promise<Series> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("org_daily_events", { target: orgId, days })
  return fillDays((data ?? []) as DayRow[], days, new Date().toISOString().slice(0, 10))
}

export type TopPost = { post_id: string; body: string; created_at: string; views: number; shares: number; moved: number; saves: number; comments: number }
export async function getOrgTopPosts(orgId: string): Promise<TopPost[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("org_top_posts", { target: orgId, days: 30, lim: 5 })
  return ((data ?? []) as TopPost[]).map((r) => ({ ...r, views: Number(r.views), shares: Number(r.shares), moved: Number(r.moved), saves: Number(r.saves), comments: Number(r.comments) }))
}

// ---------------------------------------------------------------------------
// LinkedIn-style sidebars and search
// ---------------------------------------------------------------------------
export type Viewer = {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  following: number
  causes: Cause[]
}

export async function getViewer(userId: string | null): Promise<Viewer | null> {
  if (!userId) return null
  const supabase = await createClient()
  const [{ data: profile }, { count }, { data: causes }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").eq("id", userId).single(),
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

// Confirmed grants given by these foundations (ids only), for portfolio feeds.
export async function getConfirmedGrantIds(foundationIds: string[]): Promise<string[]> {
  if (foundationIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.from("grants").select("id").in("foundation_id", foundationIds).not("confirmed_at", "is", null)
  return (data ?? []).map((g) => g.id)
}

// A foundation's portfolio: grant reports from the nonprofits it funded, newest first.
export async function getPortfolioPosts(foundationId: string): Promise<Post[]> {
  const grantIds = await getConfirmedGrantIds([foundationId])
  if (grantIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select(`${POST_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type)`)
    .eq("published", true)
    .in("reports_grant_id", grantIds)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)
  return (data ?? []) as unknown as Post[]
}

// The viewer's follow of one org: following at all, and shown publicly as support.
export async function getFollow(userId: string | null, orgId: string) {
  if (!userId) return { following: false, supporter: false }
  const supabase = await createClient()
  const { data } = await supabase.from("follows").select("supporter").match({ user_id: userId, org_id: orgId }).maybeSingle()
  return { following: !!data, supporter: !!data?.supporter }
}

// Open calls still accepting applications, soonest deadline first (not engagement-ranked).
// causes: only calls open to at least one of these causes (calls with no causes listed are open to all).
export async function getOpenCalls(opts: { causes?: string[]; limit?: number } = {}): Promise<Post[]> {
  const supabase = await createClient()
  let query = supabase
    .from("posts")
    .select(`${POST_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type)`)
    .eq("published", true)
    .eq("kind", "open_call")
    .gte("call_deadline", new Date().toISOString().slice(0, 10))
    .order("call_deadline", { ascending: true })
    .limit(opts.limit ?? 50)
  if (opts.causes?.length) query = query.or(`call_causes.ov.{${opts.causes.join(",")}},call_causes.eq.{}`)
  const { data } = await query
  return (data ?? []) as unknown as Post[]
}

// An org's own recent posts, for the dashboard's edit/delete list.
export async function getOrgPostsForStaff(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, kind, body, created_at, edited_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10)
  return data ?? []
}

export async function getSavedPostIds(userId: string | null, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId).in("post_id", postIds)
  return new Set((data ?? []).map((s) => s.post_id))
}

// The viewer's saved posts, most recently saved first.
export async function getSavedPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("saved_posts")
    .select(`created_at, post:posts!inner(${POST_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type))`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
  return ((data ?? []) as unknown as { post: Post }[]).map((r) => r.post)
}


// Open needs (newest first), then needs met in the last month.
export async function getOrgNeeds(orgId: string): Promise<Need[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - MET_SHOWN_DAYS * 86_400_000).toISOString()
  const { data } = await supabase
    .from("org_needs")
    .select("id, kind, title, detail, help_url, met_at, created_at")
    .eq("org_id", orgId)
    .or(`met_at.is.null,met_at.gte.${since}`)
    .order("created_at", { ascending: false })
  const needs = (data ?? []) as Need[]
  return [...needs.filter((n) => !n.met_at), ...needs.filter((n) => n.met_at)]
}

// Thank-you notes to an org (staff only under RLS), newest first.
export async function getThanks(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("thanks")
    .select("id, body, created_at, author:profiles(handle, display_name, avatar_url)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30)
  return (data ?? []) as unknown as { id: string; body: string; created_at: string; author: { handle: string; display_name: string | null; avatar_url: string | null } }[]
}

// The viewer's own gift log (private under RLS), newest first.
export async function getGifts(userId: string): Promise<Gift[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("gifts")
    .select("id, amount_usd, given_on, note, org:orgs(id, slug, name)")
    .eq("user_id", userId)
    .order("given_on", { ascending: false })
    .order("created_at", { ascending: false })
  return (data ?? []) as unknown as Gift[]
}

// Orgs a donor can log a gift to: the ones they follow, alphabetical.
export async function getFollowedOrgs(userId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("follows").select("org:orgs!inner(id, name)").eq("user_id", userId)
  return ((data ?? []) as unknown as { org: { id: string; name: string } }[]).map((f) => f.org).sort((a, b) => a.name.localeCompare(b.name))
}

// Open needs across the network, newest first (Ways to help). Optional cause filter on the org's causes.
export async function getOpenNeeds(opts: { cause?: string; limit?: number } = {}): Promise<NeedWithOrg[]> {
  const supabase = await createClient()
  const causeJoin = opts.cause ? ", org_causes!inner(cause_slug)" : ""
  let q = supabase
    .from("org_needs")
    .select(`id, kind, title, detail, help_url, met_at, created_at, org:orgs!inner(id, slug, name, logo_url, org_type${causeJoin})`)
    .is("met_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.cause) q = q.eq("org.org_causes.cause_slug", opts.cause)
  const { data } = await q
  return (data ?? []) as unknown as NeedWithOrg[]
}

// Confirmed grants a foundation gave that have no report yet, oldest first.
export async function getGrantsAwaitingReport(foundationId: string): Promise<Grant[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("grants")
    .select(GRANT_FIELDS)
    .eq("foundation_id", foundationId)
    .not("confirmed_at", "is", null)
    .order("awarded_on", { ascending: true })
  return ((data ?? []) as unknown as Grant[]).filter((g) => g.reports.length === 0)
}

// One org by id, for preselecting it in a form (visible orgs only, under RLS).
export async function getOrgName(id: string): Promise<{ id: string; name: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  const { data } = await supabase.from("orgs").select("id, name").eq("id", id).maybeSingle()
  return data
}

const EVENT_FIELDS = "id, title, starts_at, location, detail"

// Upcoming events across the network, soonest first. Optional cause filter on the org's causes.
export async function getUpcomingEvents(opts: { cause?: string; orgId?: string; limit?: number } = {}): Promise<EventWithOrg[]> {
  const supabase = await createClient()
  const causeJoin = opts.cause ? ", org_causes!inner(cause_slug)" : ""
  let q = supabase
    .from("org_events")
    .select(`${EVENT_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type${causeJoin})`)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(opts.limit ?? 50)
  if (opts.cause) q = q.eq("org.org_causes.cause_slug", opts.cause)
  if (opts.orgId) q = q.eq("org_id", opts.orgId)
  const { data } = await q
  return (data ?? []) as unknown as EventWithOrg[]
}

// Which of these events / needs the viewer RSVPed to / raised a hand for (private).
export async function getMyRsvpIds(userId: string | null, eventIds: string[]): Promise<Set<string>> {
  if (!userId || eventIds.length === 0) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from("event_rsvps").select("event_id").eq("user_id", userId).in("event_id", eventIds)
  return new Set((data ?? []).map((r) => r.event_id))
}

export async function getMyInterestIds(userId: string | null, needIds: string[]): Promise<Set<string>> {
  if (!userId || needIds.length === 0) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from("need_interest").select("need_id").eq("user_id", userId).in("need_id", needIds)
  return new Set((data ?? []).map((r) => r.need_id))
}

type Person = { handle: string; display_name: string | null }

// Staff view: upcoming events with who's coming (RLS: org staff only see RSVPs).
export async function getEventsForStaff(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_events")
    .select(`${EVENT_FIELDS}, rsvps:event_rsvps(person:profiles(handle, display_name))`)
    .eq("org_id", orgId)
    .gt("starts_at", new Date(Date.now() - 86_400_000).toISOString())
    .order("starts_at")
  return ((data ?? []) as unknown as (OrgEvent & { rsvps: { person: Person }[] })[]).map((e) => ({ ...e, people: e.rsvps.map((r) => r.person) }))
}

// Staff view: who raised a hand for each volunteer need.
export async function getInterestForStaff(orgId: string): Promise<Map<string, Person[]>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("need_interest")
    .select("need_id, person:profiles(handle, display_name), need:org_needs!inner(org_id)")
    .eq("need.org_id", orgId)
    .order("created_at")
  const map = new Map<string, Person[]>()
  for (const r of (data ?? []) as unknown as { need_id: string; person: Person }[]) map.set(r.need_id, [...(map.get(r.need_id) ?? []), r.person])
  return map
}

// Posts from orgs the donor logged gifts to, published since their first gift to that org.
export async function getSinceYourGifts(gifts: Gift[]) {
  const first = new Map<string, string>()
  for (const g of gifts) if (!first.has(g.org.id) || g.given_on < first.get(g.org.id)!) first.set(g.org.id, g.given_on)
  if (first.size === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, body, kind, created_at, org:orgs!inner(id, slug, name, logo_url, org_type)")
    .in("org_id", [...first.keys()])
    .gte("created_at", [...first.values()].sort()[0])
    .order("created_at", { ascending: false })
    .limit(40)
  return ((data ?? []) as unknown as { id: string; body: string; kind: string; created_at: string; org: OrgSummary }[])
    .filter((p) => p.created_at.slice(0, 10) >= first.get(p.org.id)!)
    .slice(0, 8)
}

// A post's comments (threaded by the caller). Public when the post is.
export async function getComments(postId: string): Promise<Comment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("comments")
    .select("id, parent_id, body, as_org, donor, created_at, user_id, author:profiles(handle, display_name, bio, avatar_url)")
    .eq("post_id", postId)
    .order("created_at")
    .limit(500)
  return (data ?? []) as unknown as Comment[]
}

// "N followers" in post headers, for several orgs at once.
export async function getFollowerCounts(orgIds: string[]): Promise<Map<string, number>> {
  if (orgIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase.rpc("follower_counts", { targets: [...new Set(orgIds)] })
  return new Map(((data ?? []) as { org_id: string; n: number }[]).map((r) => [r.org_id, Number(r.n)]))
}

// Whether the viewer could show a Donor badge on this org's posts but hasn't opted in.
export async function donorBadgeHint(userId: string | null, orgId: string): Promise<boolean> {
  if (!userId) return false
  const supabase = await createClient()
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("donor_badge").eq("id", userId).single(),
    supabase.from("gifts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("org_id", orgId),
  ])
  return !profile?.donor_badge && (count ?? 0) > 0
}

export async function isOrgStaff(userId: string | null, orgId: string): Promise<boolean> {
  if (!userId) return false
  const supabase = await createClient()
  const { data } = await supabase.from("org_members").select("user_id").match({ org_id: orgId, user_id: userId }).maybeSingle()
  return !!data
}

// Feed comment preview: newest top-level comment per post, for a page of posts at once.
export async function getLatestComments(postIds: string[]): Promise<Map<string, Comment & { more: boolean }>> {
  if (postIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase.rpc("latest_comments", { post_ids: postIds })
  type Row = Omit<Comment, "author"> & { post_id: string; handle: string; display_name: string | null; bio: string | null; avatar_url: string | null; more: boolean }
  return new Map(((data ?? []) as Row[]).map(({ handle, display_name, bio, avatar_url, post_id, ...c }) => [post_id, { ...c, author: { handle, display_name, bio, avatar_url } }]))
}

// Profile "Gave to": orgs a person logged gifts to, only if they opted in (names only).
export async function getDonorOrgs(userId: string): Promise<OrgSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("donor_orgs", { target: userId })
  return ((data ?? []) as OrgSummary[]).sort((a, b) => a.name.localeCompare(b.name))
}

// Profile Activity: a person's public comments, newest first, with the post they're on.
export type ActivityItem = { id: string; body: string; created_at: string; donor: boolean; parent_id: string | null; post: { id: string; body: string; org: OrgSummary } }
export async function getActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, donor, parent_id, post:posts!inner(id, body, org:orgs!inner(id, slug, name, logo_url, org_type))")
    .eq("user_id", userId)
    .eq("as_org", false)
    .order("created_at", { ascending: false })
    .limit(30)
  return (data ?? []) as unknown as ActivityItem[]
}

// Search people by name or handle (profiles are public).
export async function searchPeople(q: string) {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const supabase = await createClient()
  const e = orFilterTerm(term)
  if (!e) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url")
    .or(`display_name.ilike.%${e}%,handle.ilike.%${e}%`)
    .order("display_name")
    .limit(20)
  return data ?? []
}

// Search post text by word start, newest first (published posts of visible orgs, under RLS).
export async function searchPosts(q: string) {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("id, body, kind, created_at, org:orgs!inner(id, slug, name, logo_url, org_type)")
    .filter("body", "imatch", wordStartPattern(term)) // "river" finds "riverbank", not "drivers"
    .order("created_at", { ascending: false })
    .limit(20)
  return (data ?? []) as unknown as { id: string; body: string; kind: string; created_at: string; org: OrgSummary }[]
}
