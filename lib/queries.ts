import { milesBetween, type MapItem } from "@/lib/geo"
import { communityIconSrc } from "@/lib/community-icon"
import { logoSrc } from "@/lib/logo"
import { cache } from "react"
import { type Cursor, encodeCursor, olderThan } from "@/lib/cursor"
import { type DayRow, fillDays, type Series, total } from "@/lib/analytics"
import type { Comment } from "@/lib/comments"
import type { EventWithOrg, OrgEvent } from "@/lib/events"
import type { Gift } from "@/lib/gifts"
import type { HoursEntry } from "@/lib/volunteer"
import { MET_SHOWN_DAYS, type Need, type NeedKind, type NeedWithOrg } from "@/lib/needs"
import { escapeLike, orFilterTerm, wordStartPattern } from "@/lib/search"
import { createClient } from "@/lib/supabase/server"
import type { Cause, Grant, ImpactStat, Org, OrgSummary, OrgType, Post, PostAuthor } from "@/lib/types"

const PAGE_SIZE = 20
const POST_FIELDS = `id, org_id, author_id, kind, body, embed_url, embed_credit, video_path, video_poster_path, video_alt, video_credit, image_paths, image_alts, image_credits, created_at, edited_at, call_deadline, call_apply_url, call_max_award, call_causes, action_url, action_date, goal_usd,
  report_grant:grants!posts_reports_grant_id_fkey(id, amount_usd, purpose, foundation:orgs!grants_foundation_id_fkey(id, slug, name, logo_url, org_type)),
  author:profiles!posts_author_id_fkey(handle, display_name, bio, avatar_url),
  about_org:orgs!posts_about_org_id_fkey(id, slug, name, logo_url, org_type, mission)`
// The posting org (null for donor posts). posts has two foreign keys to orgs, so name the one.
const ORG = "org:orgs!posts_org_id_fkey(id, slug, name, logo_url, org_type)"

type FeedOpts = { cause?: string; orgIds?: string[]; personIds?: string[]; orgType?: OrgType | "donor"; reportGrantIds?: string[]; before?: Cursor }

// Chronological, no engagement ranking (design principle #4). One page plus a cursor for the next.
// reportGrantIds: also include grant reports on these grants (portfolio of followed foundations).
export async function getFeedPage(opts: FeedOpts = {}): Promise<{ posts: Post[]; next: string | null }> {
  const supabase = await createClient()
  // Filtering by an org's type or cause needs an inner join; otherwise donor posts (no org) are included.
  const cause = opts.orgType === "donor" ? undefined : opts.cause // donor posts have no org causes
  const orgFilter = cause || opts.orgType === "nonprofit" || opts.orgType === "foundation"
  const orgJoin = cause
    ? "org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type, org_causes!inner(cause_slug))"
    : orgFilter ? "org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type)" : ORG

  let query = supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${orgJoin}`)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (cause) query = query.eq("org.org_causes.cause_slug", cause)
  // Following feed: followed orgs, grant reports from followed foundations' grantees, and posts by followed people.
  if (opts.orgIds) {
    const any = [
      opts.orgIds.length ? `org_id.in.(${opts.orgIds.join(",")})` : null,
      opts.reportGrantIds?.length ? `reports_grant_id.in.(${opts.reportGrantIds.join(",")})` : null,
      opts.personIds?.length ? `and(org_id.is.null,author_id.in.(${opts.personIds.join(",")}))` : null,
    ].filter(Boolean)
    query = any.length ? query.or(any.join(",")) : query.eq("id", "00000000-0000-0000-0000-000000000000")
  }
  if (opts.orgType === "donor") query = query.is("org_id", null)
  else if (opts.orgType) query = query.eq("org.org_type", opts.orgType)
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
    .select("id, slug, name, ein, website, mission, what_gifts_fund, logo_url, everyorg_slug, status, org_type, cover_url, about, location, founded_year, team_size, programs")
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
    .select(`${POST_FIELDS}, ${ORG}`)
    .eq("id", id)
    .maybeSingle()
  return data as unknown as Post | null
}

// Cached per request (feeds, cards and headers all ask).
export const getFollowedOrgIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("follows").select("org_id").eq("user_id", userId)
  return (data ?? []).map((f) => f.org_id)
})

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
  bio: string | null
  location: string | null
  cover_url: string | null
  following: number
  causes: Cause[]
}

export const getViewer = cache(async (userId: string | null): Promise<Viewer | null> => {
  if (!userId) return null
  const supabase = await createClient()
  const [{ data: profile }, { count }, { count: people }, { data: causes }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url, bio, location, cover_url").eq("id", userId).single(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("person_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("profile_causes").select("cause:causes(slug, name)").eq("user_id", userId),
  ])
  if (!profile) return null
  return {
    ...profile,
    following: (count ?? 0) + (people ?? 0),
    causes: ((causes ?? []) as unknown as { cause: Cause }[]).map((c) => c.cause),
  }
})

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
    .select(`${POST_FIELDS}, org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type)`)
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
    .select(`${POST_FIELDS}, org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type)`)
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
    .select(`created_at, post:posts!inner(${POST_FIELDS}, ${ORG})`)
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
export async function getOpenNeeds(opts: { cause?: string; limit?: number; kinds?: NeedKind[] } = {}): Promise<NeedWithOrg[]> {
  const supabase = await createClient()
  const causeJoin = opts.cause ? ", org_causes!inner(cause_slug)" : ""
  let q = supabase
    .from("org_needs")
    .select(`id, kind, title, detail, help_url, met_at, created_at, org:orgs!inner(id, slug, name, logo_url, org_type${causeJoin})`)
    .is("met_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.cause) q = q.eq("org.org_causes.cause_slug", opts.cause)
  if (opts.kinds) q = q.in("kind", opts.kinds)
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

type Person = { handle: string; display_name: string | null; avatar_url: string | null }

// Staff view: upcoming events with who's coming (RLS: org staff only see RSVPs).
export async function getEventsForStaff(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_events")
    .select(`${EVENT_FIELDS}, rsvps:event_rsvps(person:profiles(handle, display_name, avatar_url))`)
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
    .select("need_id, person:profiles(handle, display_name, avatar_url), need:org_needs!inner(org_id)")
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
    .select("id, body, kind, created_at, org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type)")
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

// F-094: comment counts (public) and moved counts (null unless you wrote the post or staff its org).
export type PostCounts = { comments: number; moved: number | null }
export async function getPostCounts(postIds: string[]): Promise<Map<string, PostCounts>> {
  if (postIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase.rpc("post_counts", { post_ids: postIds })
  return new Map(((data ?? []) as { post_id: string; comments: number; moved: number | null }[]).map((r) => [r.post_id, { comments: Number(r.comments), moved: r.moved === null ? null : Number(r.moved) }]))
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
export type ActivityItem = { id: string; body: string; created_at: string; donor: boolean; parent_id: string | null; post: { id: string; body: string; org: OrgSummary | null; author: PostAuthor | null } }
export async function getActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, donor, parent_id, post:posts!inner(id, body, org:orgs!posts_org_id_fkey(id, slug, name, logo_url, org_type), author:profiles!posts_author_id_fkey(handle, display_name, bio, avatar_url))")
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
    .select("id, body, kind, created_at, org:orgs!posts_org_id_fkey(id, slug, name, logo_url, org_type), author:profiles!posts_author_id_fkey(handle, display_name, bio, avatar_url)")
    .filter("body", "imatch", wordStartPattern(term)) // "river" finds "riverbank", not "drivers"
    .order("created_at", { ascending: false })
    .limit(20)
  return (data ?? []) as unknown as { id: string; body: string; kind: string; created_at: string; org: OrgSummary | null; author: PostAuthor | null }[]
}

export type EventDetail = OrgEvent & { org: OrgSummary & { cover_url: string | null; mission: string | null }; causes: string[] }

// One event with its host (visible orgs only, under RLS); null when missing.
export async function getEvent(id: string): Promise<EventDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_events")
    .select(`${EVENT_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type, cover_url, mission, org_causes(cause_slug))`)
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  const { org_causes, ...org } = (data as unknown as { org: EventDetail["org"] & { org_causes: { cause_slug: string }[] } }).org
  return { ...(data as unknown as OrgEvent), org, causes: org_causes.map((c) => c.cause_slug) }
}

export type GivingSummary = { total: number; orgs: number; since: string; causes: { slug: string; name: string }[]; byOrg: (OrgSummary & { amount: number; causes: string[] })[] }

// A donor's opted-in giving totals (self-reported, from their journal); null when not shared.
export async function getGivingSummary(userId: string): Promise<GivingSummary | null> {
  const supabase = await createClient()
  const [{ data }, { data: orgRows }] = await Promise.all([
    supabase.rpc("giving_summary", { target: userId }),
    supabase.rpc("giving_by_org", { target: userId }),
  ])
  type Row = { cause_slug: string; cause_name: string; total: number; orgs: number; since: string }
  const rows = (data ?? []) as Row[]
  if (rows.length === 0) return null
  return {
    total: Number(rows[0].total), orgs: Number(rows[0].orgs), since: rows[0].since,
    causes: rows.map((r) => ({ slug: r.cause_slug, name: r.cause_name })),
    byOrg: ((orgRows ?? []) as (OrgSummary & { amount: number; causes: string[] | null })[]).map((o) => ({ ...o, amount: Number(o.amount), causes: o.causes ?? [] })),
  }
}

export type Supporter = { kind: "foundation" | "person"; id: string; slug: string; name: string; logo_url: string | null; avatar_url: string | null; amount: number }

// A nonprofit's top supporters: foundations (confirmed grants) and opted-in individuals (self-reported).
export async function getTopSupporters(orgId: string, limit = 8): Promise<Supporter[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("top_supporters", { target: orgId, lim: limit })
  return ((data ?? []) as Supporter[]).map((s) => ({ ...s, amount: Number(s.amount) }))
}

// A person's own posts (F-079), newest first.
export async function getPersonPosts(userId: string, limit = 20): Promise<Post[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${ORG}`)
    .is("org_id", null)
    .eq("author_id", userId)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as Post[]
}

// The viewer's own volunteer log (private), newest first.
export async function getHours(userId: string): Promise<HoursEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("volunteer_hours")
    .select("id, hours, served_on, note, confirmed_at, declined_at, org:orgs(id, slug, name)")
    .eq("user_id", userId)
    .order("served_on", { ascending: false })
    .order("created_at", { ascending: false })
  return ((data ?? []) as unknown as HoursEntry[]).map((h) => ({ ...h, hours: Number(h.hours) }))
}

export type VolunteerSummary = { total: number; confirmed: number; since: string; byOrg: (OrgSummary & { hours: number; confirmed: number })[] }

// A person's opted-in volunteer hours by organization; null when not shared.
export async function getVolunteerSummary(userId: string): Promise<VolunteerSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("volunteer_summary", { target: userId })
  const rows = ((data ?? []) as (OrgSummary & { hours: number; confirmed: number; since: string })[]).map((r) => ({ ...r, hours: Number(r.hours), confirmed: Number(r.confirmed) }))
  if (rows.length === 0) return null
  return {
    total: rows.reduce((a, r) => a + r.hours, 0), confirmed: rows.reduce((a, r) => a + r.confirmed, 0),
    since: rows.map((r) => r.since).sort()[0], byOrg: rows,
  }
}

export type HoursToConfirm = { id: string; hours: number; served_on: string; note: string | null; person: { handle: string; display_name: string | null; avatar_url: string | null } }

// Org staff: shifts logged with this org that haven't been confirmed or declined, oldest first.
export async function getHoursToConfirm(orgId: string): Promise<HoursToConfirm[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("volunteer_hours")
    .select("id, hours, served_on, note, person:profiles(handle, display_name, avatar_url)")
    .eq("org_id", orgId)
    .is("confirmed_at", null)
    .is("declined_at", null)
    .order("served_on")
    .limit(50)
  return ((data ?? []) as unknown as HoursToConfirm[]).map((h) => ({ ...h, hours: Number(h.hours) }))
}

// Search upcoming events by title (F-083).
export async function searchEvents(q: string): Promise<EventWithOrg[]> {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_events")
    .select(`${EVENT_FIELDS}, org:orgs!inner(id, slug, name, logo_url, org_type)`)
    .filter("title", "imatch", wordStartPattern(term))
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20)
  return (data ?? []) as unknown as EventWithOrg[]
}

// Search open needs by title (F-083).
export async function searchNeeds(q: string): Promise<NeedWithOrg[]> {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_needs")
    .select("id, kind, title, detail, help_url, met_at, created_at, org:orgs!inner(id, slug, name, logo_url, org_type)")
    .filter("title", "imatch", wordStartPattern(term))
    .is("met_at", null)
    .order("created_at", { ascending: false })
    .limit(20)
  return (data ?? []) as unknown as NeedWithOrg[]
}

// Open calls for volunteers / donations (F-084), newest first; calls whose date has passed drop off.
export async function getCallPosts(opts: { kinds: ("call_volunteers" | "call_donations")[]; cause?: string; limit?: number }): Promise<Post[]> {
  const supabase = await createClient()
  const orgJoin = opts.cause
    ? "org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type, org_causes!inner(cause_slug))"
    : ORG
  let q = supabase
    .from("posts")
    .select(`${POST_FIELDS}, ${orgJoin}`)
    .in("kind", opts.kinds)
    .eq("published", true)
    .or(`action_date.is.null,action_date.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20)
  if (opts.cause) q = q.eq("org.org_causes.cause_slug", opts.cause)
  const { data } = await q
  return (data ?? []) as unknown as Post[]
}

// People the viewer follows (F-086). Cached per request.
export const getFollowedPersonIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("person_follows").select("followee_id").eq("follower_id", userId)
  return (data ?? []).map((r) => r.followee_id)
})

// Left column (F-087): the viewer's own private totals this year, and the org they work for.
export type ViewerExtras = {
  givenThisYear: number
  hoursThisYear: number
  org: (OrgSummary & { followers: number; views: number }) | null
  topSupported: OrgSummary | null
}
export const getViewerExtras = cache(async (userId: string): Promise<ViewerExtras> => {
  const supabase = await createClient()
  const year = `${new Date().getFullYear()}-01-01`
  const [{ data: gifts }, { data: hours }, { data: member }, { data: support }] = await Promise.all([
    supabase.from("gifts").select("amount_usd, org_id").eq("user_id", userId).gte("given_on", year),
    supabase.from("volunteer_hours").select("hours").eq("user_id", userId).gte("served_on", year),
    supabase.from("org_members").select("org:orgs(id, slug, name, logo_url, org_type)").eq("user_id", userId).order("created_at").limit(1).maybeSingle(),
    supabase.from("follows").select("org:orgs(id, slug, name, logo_url, org_type)").eq("user_id", userId).eq("supporter", true).limit(1).maybeSingle(),
  ])
  const org = (member as unknown as { org: OrgSummary } | null)?.org ?? null
  let orgStats = null
  if (org) {
    const [{ data: followers }, counts] = await Promise.all([supabase.rpc("follower_count", { target: org.id }), getOrgEventCounts(org.id)])
    orgStats = { ...org, followers: Number(followers ?? 0), views: counts.view }
  }
  return {
    givenThisYear: (gifts ?? []).reduce((a, g) => a + g.amount_usd, 0),
    hoursThisYear: (hours ?? []).reduce((a, h) => a + Number(h.hours), 0),
    org: orgStats,
    topSupported: (support as unknown as { org: OrgSummary } | null)?.org ?? null,
  }
})

// Following page (F-088) ------------------------------------------------------------------
export async function getFollowedCauseSlugs(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("profile_causes").select("cause_slug").eq("user_id", userId)
  return (data ?? []).map((r) => r.cause_slug)
}


export type FollowedOrg = OrgSummaryWithMission & { causes: string[] }
export async function getFollowedOrgsDetail(userId: string): Promise<FollowedOrg[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("follows")
    .select("org:orgs!inner(id, slug, name, logo_url, org_type, mission, org_causes(cause_slug))")
    .eq("user_id", userId)
  return ((data ?? []) as unknown as { org: OrgSummaryWithMission & { org_causes: { cause_slug: string }[] } }[])
    .map(({ org: { org_causes, ...o } }) => ({ ...o, causes: org_causes.map((c) => c.cause_slug) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getFollowedPeople(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("person_follows")
    .select("person:profiles!person_follows_followee_id_fkey(id, handle, display_name, bio, avatar_url, location, public_figure, public_figure_note)")
    .eq("follower_id", userId)
  return ((data ?? []) as unknown as { person: { id: string; handle: string; display_name: string | null; bio: string | null; avatar_url: string | null; location: string | null; public_figure: boolean; public_figure_note: string | null } }[])
    .map((r) => r.person)
    .sort((a, b) => (a.display_name ?? a.handle).localeCompare(b.display_name ?? b.handle))
}

// Orgs in these causes the viewer doesn't follow yet, alphabetical (never popularity-ranked).
export async function getOrgsInCauses(causes: string[], exclude: string[], limit = 5): Promise<OrgSummaryWithMission[]> {
  if (causes.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_url, org_type, mission, org_causes!inner(cause_slug)")
    .eq("status", "verified")
    .in("org_causes.cause_slug", causes)
    .order("name")
  const seen = new Set(exclude)
  const out: OrgSummaryWithMission[] = []
  for (const o of (data ?? []) as unknown as (OrgSummaryWithMission & { org_causes: unknown })[]) {
    if (seen.has(o.id)) continue
    seen.add(o.id)
    const { org_causes: _c, ...rest } = o
    void _c
    out.push(rest)
    if (out.length >= limit) break
  }
  return out
}

// Verified orgs by cause (F-088 cause panels), alphabetical.
export const getOrgsByCause = cache(async (): Promise<Record<string, OrgSummaryWithMission[]>> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("org_causes")
    .select("cause_slug, org:orgs!inner(id, slug, name, logo_url, org_type, mission, status)")
    .eq("org.status", "verified")
  const out: Record<string, OrgSummaryWithMission[]> = {}
  for (const r of (data ?? []) as unknown as { cause_slug: string; org: OrgSummaryWithMission & { status: string } }[]) {
    const { status: _s, ...org } = r.org
    void _s
    ;(out[r.cause_slug] ??= []).push(org)
  }
  for (const k in out) out[k].sort((a, b) => a.name.localeCompare(b.name))
  return out
})

// F-099: gifts made on imnet to an org, for its staff (names hidden for anonymous donors).
export type OrgDonation = { id: string; amount_cents: number; monthly: boolean; created_at: string; donor_name: string | null; donor_handle: string | null; donor_avatar: string | null }
export type OrgDonations = { list: OrgDonation[]; total30: number; count30: number; monthlyDonors: number }
export async function getOrgDonations(orgId: string): Promise<OrgDonations> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("org_donations", { target: orgId, lim: 200 })
  const list = (data ?? []) as OrgDonation[]
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const recent = list.filter((d) => d.created_at >= since)
  return {
    list,
    total30: recent.reduce((a, d) => a + d.amount_cents, 0),
    count30: recent.length,
    monthlyDonors: new Set(list.filter((d) => d.monthly).map((d) => d.donor_handle ?? d.id)).size,
  }
}

// ---------------------------------------------------------------------------
// F-100 Groups and messages
// ---------------------------------------------------------------------------
export type Group = { id: string; slug: string; name: string; description: string | null; cause_slug: string | null; icon_path: string | null; location?: string | null; created_at: string }
export type GroupCard = Group & { members: number; lastAt: string | null; unread: boolean }
export type ChatAuthor = { id: string; handle: string; display_name: string | null; avatar_url: string | null }
export type ChatMessage = { id: string; body: string; created_at: string; author: ChatAuthor }
export type ChatTarget = { group: string } | { conversation: string }

async function memberCounts(ids: string[]) {
  if (ids.length === 0) return new Map<string, number>()
  const supabase = await createClient()
  const { data } = await supabase.rpc("group_member_counts", { targets: ids })
  return new Map(((data ?? []) as { group_id: string; members: number }[]).map((r) => [r.group_id, Number(r.members)]))
}

// Your groups, most recently active first, with a quiet unread flag.
export async function getMyGroups(userId: string): Promise<GroupCard[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("group_members").select("last_read_at, group:groups!inner(id, slug, name, description, cause_slug, icon_path, created_at)").eq("user_id", userId)
  const rows = (data ?? []) as unknown as { last_read_at: string; group: Group }[]
  const ids = rows.map((r) => r.group.id)
  const [counts, latest] = await Promise.all([
    memberCounts(ids),
    ids.length ? supabase.from("messages").select("group_id, created_at, author_id").in("group_id", ids).order("created_at", { ascending: false }).limit(500) : null,
  ])
  const last = new Map<string, { at: string; author: string }>()
  for (const m of (latest?.data ?? []) as { group_id: string; created_at: string; author_id: string }[]) if (!last.has(m.group_id)) last.set(m.group_id, { at: m.created_at, author: m.author_id })
  return rows
    .map((r) => {
      const l = last.get(r.group.id)
      return { ...r.group, members: counts.get(r.group.id) ?? 0, lastAt: l?.at ?? null, unread: !!l && l.author !== userId && l.at > r.last_read_at }
    })
    .sort((a, b) => (b.lastAt ?? b.created_at).localeCompare(a.lastAt ?? a.created_at))
}

// Groups to discover (not yet joined), largest first within a cause.
export async function getDiscoverGroups(userId: string | null, cause?: string): Promise<GroupCard[]> {
  const supabase = await createClient()
  let q = supabase.from("groups").select("id, slug, name, description, cause_slug, icon_path, created_at").limit(100)
  if (cause) q = q.eq("cause_slug", cause)
  const { data } = await q
  let groups = (data ?? []) as Group[]
  if (userId) {
    const { data: mine } = await supabase.from("group_members").select("group_id").eq("user_id", userId)
    const joined = new Set((mine ?? []).map((m) => m.group_id))
    groups = groups.filter((g) => !joined.has(g.id))
  }
  const counts = await memberCounts(groups.map((g) => g.id))
  return groups.map((g) => ({ ...g, members: counts.get(g.id) ?? 0, lastAt: null, unread: false })).sort((a, b) => b.members - a.members || a.name.localeCompare(b.name))
}

export async function getGroupBySlug(slug: string, userId: string | null) {
  const supabase = await createClient()
  const { data } = await supabase.from("groups").select("id, slug, name, description, cause_slug, icon_path, location, created_at").eq("slug", slug).maybeSingle()
  if (!data) return null
  const group = data as Group
  const [counts, me] = await Promise.all([
    memberCounts([group.id]),
    userId ? supabase.from("group_members").select("role").match({ group_id: group.id, user_id: userId }).maybeSingle() : null,
  ])
  return { group, members: counts.get(group.id) ?? 0, role: (me?.data?.role ?? null) as "owner" | "member" | null }
}

export async function getGroupMembers(groupId: string): Promise<(ChatAuthor & { role: "owner" | "member"; bio: string | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("group_members").select("role, joined_at, person:profiles!inner(id, handle, display_name, avatar_url, bio)").eq("group_id", groupId).order("joined_at").limit(200)
  return ((data ?? []) as unknown as { role: "owner" | "member"; person: ChatAuthor & { bio: string | null } }[])
    .map((r) => ({ ...r.person, role: r.role }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1))
}

// A page of messages, oldest first (after: only newer ones, for polling).
export async function getMessages(target: ChatTarget, opts: { after?: string; limit?: number } = {}): Promise<ChatMessage[]> {
  const supabase = await createClient()
  let q = supabase.from("messages").select("id, body, created_at, author:profiles!messages_author_id_fkey(id, handle, display_name, avatar_url)")
  q = "group" in target ? q.eq("group_id", target.group) : q.eq("conversation_id", target.conversation)
  if (opts.after) q = q.gt("created_at", opts.after)
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 80)
  return ((data ?? []) as unknown as ChatMessage[]).reverse()
}

export type ConversationCard = { id: string; other: ChatAuthor; last: { body: string; at: string; mine: boolean } | null; unread: boolean }
export async function getConversations(userId: string): Promise<ConversationCard[]> {
  const supabase = await createClient()
  const { data: mine } = await supabase.from("conversation_members").select("conversation_id, last_read_at").eq("user_id", userId)
  const ids = (mine ?? []).map((m) => m.conversation_id)
  if (ids.length === 0) return []
  const [{ data: others }, { data: msgs }] = await Promise.all([
    supabase.from("conversation_members").select("conversation_id, person:profiles!inner(id, handle, display_name, avatar_url)").in("conversation_id", ids).neq("user_id", userId),
    supabase.from("messages").select("conversation_id, body, created_at, author_id").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500),
  ])
  const readAt = new Map((mine ?? []).map((m) => [m.conversation_id, m.last_read_at as string]))
  const last = new Map<string, { body: string; at: string; author: string }>()
  for (const m of (msgs ?? []) as { conversation_id: string; body: string; created_at: string; author_id: string }[]) if (!last.has(m.conversation_id)) last.set(m.conversation_id, { body: m.body, at: m.created_at, author: m.author_id })
  return ((others ?? []) as unknown as { conversation_id: string; person: ChatAuthor }[])
    .map((o) => {
      const l = last.get(o.conversation_id)
      return { id: o.conversation_id, other: o.person, last: l ? { body: l.body, at: l.at, mine: l.author === userId } : null, unread: !!l && l.author !== userId && l.at > (readAt.get(o.conversation_id) ?? "") }
    })
    .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""))
}

export async function hasUnreadMessages(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("has_unread_messages")
  return !!data
}

// F-101 Everything with a place, for the Near you map: volunteer calls and needs (at their org),
// upcoming events, and communities. Filtering by distance happens in the browser.
export async function getMapItems(): Promise<MapItem[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const ORG = "id, slug, name, logo_url, org_type, location, lat, lng, org_causes(cause_slug)"
  type O = { id: string; slug: string; name: string; logo_url: string | null; org_type: "nonprofit" | "foundation"; location: string | null; lat: number | null; lng: number | null; org_causes: { cause_slug: string }[] }
  const [calls, needs, events, groups, orgs] = await Promise.all([
    supabase.from("posts").select(`id, body, action_date, org:orgs!posts_org_id_fkey!inner(${ORG})`).eq("kind", "call_volunteers").not("org.lat", "is", null).or(`action_date.is.null,action_date.gte.${today}`).order("created_at", { ascending: false }).limit(200),
    supabase.from("org_needs").select(`id, title, kind, org:orgs!inner(${ORG})`).is("met_at", null).eq("kind", "volunteer").not("org.lat", "is", null).limit(200),
    supabase.from("org_events").select(`id, title, starts_at, location, lat, lng, org:orgs!inner(${ORG})`).gt("starts_at", now).not("lat", "is", null).order("starts_at").limit(300),
    supabase.from("groups").select("id, slug, name, description, cause_slug, icon_path, location, lat, lng").not("lat", "is", null).limit(300),
    // F-105: the organizations themselves, nonprofits and foundations.
    supabase.from("orgs").select("id, slug, name, mission, logo_url, org_type, location, lat, lng, org_causes(cause_slug)").eq("status", "verified").not("lat", "is", null).limit(500),
  ])
  const counts = await memberCounts(((groups.data ?? []) as { id: string }[]).map((g) => g.id))
  const logo = (o: O) => ({ name: o.name, logo_url: o.logo_url, org_type: o.org_type })
  const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const items: MapItem[] = []
  for (const c of (calls.data ?? []) as unknown as { id: string; body: string; action_date: string | null; org: O }[]) {
    items.push({ id: `call-${c.id}`, kind: "volunteer", title: c.body.split(/(?<=[.!?])\s/)[0].slice(0, 90), subtitle: `${c.org.name}${c.action_date ? ` · ${day(c.action_date)}` : ""}`, href: `/p/${c.id}`, place: c.org.location, lat: c.org.lat!, lng: c.org.lng!, logo: logo(c.org), image: logoSrc(c.org.logo_url), cause: c.org.org_causes[0]?.cause_slug ?? null })
  }
  for (const n of (needs.data ?? []) as unknown as { id: string; title: string; org: O }[]) {
    items.push({ id: `need-${n.id}`, kind: "volunteer", title: n.title, subtitle: n.org.name, href: `/o/${n.org.slug}#needs`, place: n.org.location, lat: n.org.lat!, lng: n.org.lng!, logo: logo(n.org), image: logoSrc(n.org.logo_url), cause: n.org.org_causes[0]?.cause_slug ?? null })
  }
  for (const e of (events.data ?? []) as unknown as { id: string; title: string; starts_at: string; location: string; lat: number; lng: number; org: O }[]) {
    items.push({ id: `event-${e.id}`, kind: "event", title: e.title, subtitle: `${e.org.name} · ${new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, href: `/e/${e.id}`, place: e.location, lat: e.lat, lng: e.lng, logo: logo(e.org), image: logoSrc(e.org.logo_url), cause: e.org.org_causes[0]?.cause_slug ?? null })
  }
  for (const g of (groups.data ?? []) as { id: string; slug: string; name: string; description: string | null; cause_slug: string | null; icon_path: string | null; location: string | null; lat: number; lng: number }[]) {
    const m = counts.get(g.id) ?? 0
    items.push({ id: `community-${g.id}`, kind: "community", title: g.name, subtitle: `Community · ${m} ${m === 1 ? "member" : "members"}`, href: `/communities/${g.slug}`, place: g.location, lat: g.lat, lng: g.lng, cause: g.cause_slug, image: communityIconSrc(g.icon_path) })
  }
  for (const o of (orgs.data ?? []) as unknown as (O & { mission: string | null })[]) {
    items.push({ id: `org-${o.id}`, kind: o.org_type, title: o.name, subtitle: o.mission ?? (o.org_type === "foundation" ? "Foundation" : "Nonprofit"), href: `/o/${o.slug}`, place: o.location, lat: o.lat!, lng: o.lng!, logo: logo(o), image: logoSrc(o.logo_url), cause: o.org_causes[0]?.cause_slug ?? null })
  }
  return items
}

// F-102 Communities with a place, for "Communities near you" (distances are computed in the browser).
export type PlacedCommunity = { id: string; slug: string; name: string; cause_slug: string | null; icon_path: string | null; location: string; lat: number; lng: number; members: number; joined: boolean }
export async function getPlacedCommunities(userId: string | null): Promise<PlacedCommunity[]> {
  const supabase = await createClient()
  const [{ data }, mine] = await Promise.all([
    supabase.from("groups").select("id, slug, name, cause_slug, icon_path, location, lat, lng").not("lat", "is", null).limit(500),
    userId ? supabase.from("group_members").select("group_id").eq("user_id", userId) : null,
  ])
  const rows = (data ?? []) as Omit<PlacedCommunity, "members" | "joined">[]
  const counts = await memberCounts(rows.map((r) => r.id))
  const joined = new Set((mine?.data ?? []).map((m) => m.group_id))
  return rows.map((r) => ({ ...r, members: counts.get(r.id) ?? 0, joined: joined.has(r.id) }))
}

// The viewer's profile city as coordinates, when it's one we know (to center "near you" before they share a location).
export async function getProfileCity(userId: string | null): Promise<{ at: { lat: number; lng: number }; label: string } | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data: p } = await supabase.from("profiles").select("location").eq("id", userId).maybeSingle()
  if (!p?.location) return null
  const { data: c } = await supabase.from("cities").select("name, lat, lng").ilike("name", p.location.trim()).maybeSingle()
  return c ? { at: { lat: c.lat, lng: c.lng }, label: c.name } : null
}

// ---------------------------------------------------------------------------
// F-107 Your giving at work: impact stories and grant reports from organizations you gave to or
// volunteered with, posted after your first gift or shift there. Reads only your own journal rows.
// ---------------------------------------------------------------------------
export type ImpactUpdate = { id: string; body: string; created_at: string; org: OrgSummary; how: "gave" | "volunteered"; report: boolean }
export const getGivingAtWork = cache(async (userId: string, days = 60): Promise<ImpactUpdate[]> => {
  const supabase = await createClient()
  const [{ data: gifts }, { data: shifts }] = await Promise.all([
    supabase.from("gifts").select("org_id, given_on").eq("user_id", userId),
    supabase.from("volunteer_hours").select("org_id, served_on").eq("user_id", userId).is("declined_at", null),
  ])
  const first = new Map<string, { since: string; how: "gave" | "volunteered" }>()
  for (const g of gifts ?? []) { const f = first.get(g.org_id); if (!f || g.given_on < f.since) first.set(g.org_id, { since: g.given_on, how: "gave" }) }
  for (const h of shifts ?? []) { const f = first.get(h.org_id); if (!f || h.served_on < f.since) first.set(h.org_id, { since: h.served_on, how: f?.how ?? "volunteered" }) }
  if (first.size === 0) return []
  const { data } = await supabase
    .from("posts")
    .select("id, body, kind, reports_grant_id, created_at, org:orgs!posts_org_id_fkey!inner(id, slug, name, logo_url, org_type)")
    .in("org_id", [...first.keys()])
    .or("kind.eq.impact_story,reports_grant_id.not.is.null")
    .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(30)
  type Row = { id: string; body: string; kind: string; reports_grant_id: string | null; created_at: string; org: OrgSummary }
  return ((data ?? []) as unknown as Row[])
    .filter((p) => p.created_at.slice(0, 10) >= first.get(p.org.id)!.since)
    .map((p) => ({ id: p.id, body: p.body, created_at: p.created_at, org: p.org, how: first.get(p.org.id)!.how, report: !!p.reports_grant_id }))
})

// ---------------------------------------------------------------------------
// F-108 This week near you: upcoming events (next 7 days) and volunteer calls (dated in the next
// 14 days, or undated and posted in the last 30) within `radius` miles of a point, soonest first.
// ---------------------------------------------------------------------------
export type NearbySoon = { id: string; kind: "event" | "volunteer"; title: string; when: string | null; href: string; actionUrl: string | null; org: OrgSummary & { location: string | null }; place: string | null; miles: number }
export async function getThisWeekNear(at: { lat: number; lng: number }, radius = 25, limit = 3): Promise<NearbySoon[]> {
  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const in14 = new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10)
  const ORG = "id, slug, name, logo_url, org_type, location, lat, lng"
  const [events, calls] = await Promise.all([
    supabase.from("org_events").select(`id, title, starts_at, location, lat, lng, org:orgs!inner(${ORG})`).gt("starts_at", now.toISOString()).lte("starts_at", new Date(now.getTime() + 7 * 86_400_000).toISOString()).not("lat", "is", null).limit(200),
    supabase.from("posts").select(`id, body, action_date, action_url, created_at, org:orgs!posts_org_id_fkey!inner(${ORG})`).eq("kind", "call_volunteers").not("org.lat", "is", null)
      .or(`and(action_date.gte.${today},action_date.lte.${in14}),and(action_date.is.null,created_at.gte.${new Date(now.getTime() - 30 * 86_400_000).toISOString()})`).limit(200),
  ])
  type O = OrgSummary & { location: string | null; lat: number; lng: number }
  const items: NearbySoon[] = []
  for (const e of (events.data ?? []) as unknown as { id: string; title: string; starts_at: string; location: string; lat: number; lng: number; org: O }[]) {
    items.push({ id: e.id, kind: "event", title: e.title, when: e.starts_at, href: `/e/${e.id}`, actionUrl: null, org: e.org, place: e.location, miles: milesBetween(at, e) })
  }
  for (const c of (calls.data ?? []) as unknown as { id: string; body: string; action_date: string | null; action_url: string | null; org: O }[]) {
    items.push({ id: c.id, kind: "volunteer", title: c.body.split(/(?<=[.!?])\s/)[0].slice(0, 90), when: c.action_date ? `${c.action_date}T12:00:00` : null, href: `/p/${c.id}`, actionUrl: c.action_url, org: c.org, place: c.org.location, miles: milesBetween(at, c.org) })
  }
  return items
    .filter((i) => i.miles <= radius)
    // Soonest first; undated calls after dated ones; nearer breaks ties.
    .sort((a, b) => (a.when ?? "9999").localeCompare(b.when ?? "9999") || a.miles - b.miles)
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// F-111 Experiences (shared with your followers) and F-112 the involvement path
// ---------------------------------------------------------------------------
export type ExperienceKind = "volunteered" | "gave" | "attended"
export type Experience = { id: string; kind: ExperienceKind; note: string | null; created_at: string; person: ChatAuthor & { public_figure: boolean } }

// Experiences at an org that you're allowed to see (yours and people you follow; RLS decides).
export async function getOrgExperiences(orgId: string): Promise<Experience[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("experiences").select("id, kind, note, created_at, person:profiles!inner(id, handle, display_name, avatar_url, public_figure)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(30)
  return (data ?? []) as unknown as Experience[]
}

export type PersonExperience = { id: string; kind: ExperienceKind; note: string | null; created_at: string; org: OrgSummary }
export async function getPersonExperiences(userId: string): Promise<PersonExperience[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("experiences").select("id, kind, note, created_at, org:orgs!inner(id, slug, name, logo_url, org_type)").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)
  return (data ?? []) as unknown as PersonExperience[]
}

export type Involvement = {
  following: boolean
  event: { id: string; title: string; starts_at: string; going: boolean } | null
  volunteer: { href: string; title: string; logged: boolean } | null
  gave: boolean
  shared: ExperienceKind[]
}
export async function getInvolvement(org: { id: string; slug: string }, userId: string | null): Promise<Involvement> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const [follow, { data: ev }, { data: call }, { data: need }] = await Promise.all([
    getFollow(userId, org.id),
    supabase.from("org_events").select("id, title, starts_at").eq("org_id", org.id).gt("starts_at", now).order("starts_at").limit(1).maybeSingle(),
    supabase.from("posts").select("id, body").eq("org_id", org.id).eq("kind", "call_volunteers").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("org_needs").select("id, title").eq("org_id", org.id).eq("kind", "volunteer").is("met_at", null).limit(1).maybeSingle(),
  ])
  const [rsvp, hours, gifts, mine] = userId
    ? await Promise.all([
        ev ? supabase.from("event_rsvps").select("event_id").match({ event_id: ev.id, user_id: userId }).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("volunteer_hours").select("id").match({ org_id: org.id, user_id: userId }).limit(1),
        supabase.from("gifts").select("id").match({ org_id: org.id, user_id: userId }).limit(1),
        supabase.from("experiences").select("kind").match({ org_id: org.id, user_id: userId }),
      ])
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }]
  return {
    following: follow.following,
    event: ev ? { id: ev.id, title: ev.title, starts_at: ev.starts_at, going: !!rsvp.data } : null,
    volunteer: call ? { href: `/p/${call.id}`, title: call.body.split(/(?<=[.!?])\s/)[0].slice(0, 80), logged: !!hours.data?.length } : need ? { href: `/o/${org.slug}#needs`, title: need.title, logged: !!hours.data?.length } : null,
    gave: !!gifts.data?.length,
    shared: ((mine.data ?? []) as { kind: ExperienceKind }[]).map((m) => m.kind),
  }
}

// ---------------------------------------------------------------------------
// F-113 Notable givers: admin-verified public figures, with who they give to (if they share it).
// ---------------------------------------------------------------------------
export type NotableGiver = { id: string; handle: string; display_name: string | null; avatar_url: string | null; bio: string | null; public_figure_note: string | null; givesTo: OrgSummary[] }
export async function getNotableGivers(limit = 24): Promise<NotableGiver[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("id, handle, display_name, avatar_url, bio, public_figure_note").eq("public_figure", true).order("display_name").limit(limit)
  const people = (data ?? []) as Omit<NotableGiver, "givesTo">[]
  const giving = await Promise.all(people.map(async (p) => ((await supabase.rpc("giving_by_org", { target: p.id })).data ?? []) as (OrgSummary & { amount: number })[]))
  return people.map((p, i) => ({ ...p, givesTo: giving[i].sort((a, b) => b.amount - a.amount).slice(0, 4) }))
}

// F-114 Recent experiences from people you follow (RLS only returns those you may see).
export type FriendExperience = PersonExperience & { person: ChatAuthor & { public_figure: boolean } }
export async function getFriendsExperiences(userId: string, limit = 12): Promise<FriendExperience[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("experiences")
    .select("id, kind, note, created_at, org:orgs!inner(id, slug, name, logo_url, org_type), person:profiles!inner(id, handle, display_name, avatar_url, public_figure)")
    .neq("user_id", userId).order("created_at", { ascending: false }).limit(limit)
  return (data ?? []) as unknown as FriendExperience[]
}

// Who a set of people give to (only those who opted in), for public figures you follow.
export async function getGivesTo(personIds: string[]): Promise<Map<string, OrgSummary[]>> {
  const supabase = await createClient()
  const rows = await Promise.all(personIds.map(async (id) => [id, (((await supabase.rpc("giving_by_org", { target: id })).data ?? []) as (OrgSummary & { amount: number })[]).sort((a, b) => b.amount - a.amount).slice(0, 3)] as const))
  return new Map(rows)
}

// F-115 People to follow: who shares communities with you (most first), then people in your city.
// Excludes you, people you follow and public figures (they have their own row).
export type FriendSuggestion = { id: string; handle: string; display_name: string | null; avatar_url: string | null; bio: string | null; reason: string }
export async function getFriendSuggestions(userId: string, limit = 10): Promise<FriendSuggestion[]> {
  const supabase = await createClient()
  const [{ data: myGroups }, { data: follows }, { data: me }] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("user_id", userId),
    supabase.from("person_follows").select("followee_id").eq("follower_id", userId),
    supabase.from("profiles").select("location").eq("id", userId).maybeSingle(),
  ])
  const skip = new Set([userId, ...(follows ?? []).map((f) => f.followee_id)])
  const shared = new Map<string, number>()
  const groupIds = (myGroups ?? []).map((g) => g.group_id)
  if (groupIds.length) {
    const { data: co } = await supabase.from("group_members").select("user_id").in("group_id", groupIds).limit(2000)
    for (const r of co ?? []) if (!skip.has(r.user_id)) shared.set(r.user_id, (shared.get(r.user_id) ?? 0) + 1)
  }
  const top = [...shared.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 2)
  const PROFILE = "id, handle, display_name, avatar_url, bio, public_figure"
  type P = Omit<FriendSuggestion, "reason"> & { public_figure: boolean }
  const fromGroups = top.length ? (((await supabase.from("profiles").select(PROFILE).in("id", top.map(([id]) => id))).data ?? []) as P[]) : []
  const out: FriendSuggestion[] = top
    .map(([id, n]) => ({ p: fromGroups.find((x) => x.id === id), n }))
    .filter((x): x is { p: P; n: number } => !!x.p && !x.p.public_figure)
    .map(({ p, n }) => ({ id: p.id, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio, reason: `In ${n} of your communities` }))
  if (out.length < limit && me?.location) {
    const { data: near } = await supabase.from("profiles").select(PROFILE).eq("location", me.location).eq("public_figure", false).limit(limit * 2)
    const city = me.location.replace(/, [A-Z]{2}$/, "")
    for (const p of (near ?? []) as P[]) if (!skip.has(p.id) && !out.some((o) => o.id === p.id)) out.push({ id: p.id, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio, reason: `Near you · ${city}` })
  }
  return out.slice(0, limit)
}
