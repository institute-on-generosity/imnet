import "server-only"
import { cache } from "react"
import { formatUsd } from "@/lib/grants"
import { formatDeadline } from "@/lib/open-calls"
import { createClient } from "@/lib/supabase/server"

type Person = { display_name: string | null; handle: string; avatar_url: string | null }
type OrgRef = { name: string; slug: string; logo_url: string | null; org_type: "nonprofit" | "foundation" }
// Who the notification is about: shown as the avatar and the bold name (LinkedIn-style).
export type Actor = { type: "person"; name: string; handle: string; avatar_url: string | null } | ({ type: "org" } & OrgRef)
export type Notification = {
  key: string; at: string; href: string; kind: "grant" | "report" | "call" | "team" | "claim" | "thanks" | "comment" | "hours" | "event"
  actor?: Actor
  text: string // follows the actor's name; the whole sentence when there's no actor
  cta?: string
  quote?: string // the comment itself, for comments and replies
  volunteers?: { people: { name: string; avatar_url: string | null }[]; total: number } // F-090
}

const SINCE_DAYS = 60
const name = (o: { name: string } | null | undefined) => o?.name ?? "An organization"
// ': "Volunteering at the pantry this…"' (a short pointer to what it was about).
const about = (body: string | null | undefined) => {
  const t = body?.replace(/\s+/g, " ").trim()
  if (!t) return "."
  return `: “${t.length > 60 ? `${t.slice(0, 60).trimEnd()}…` : t}”`
}
const person = (p: Person): Actor => ({ type: "person", name: p.display_name ?? `@${p.handle}`, handle: p.handle, avatar_url: p.avatar_url })
const org = (o: OrgRef): Actor => ({ type: "org", ...o })
const P = "profiles(display_name, handle, avatar_url)"
const O = "name, slug, logo_url, org_type"
const amount = (n: number | null) => (n ? `${formatUsd(n)} ` : "")

// Everything here runs under the viewer's RLS, so it only ever shows what they may see.
export const getNotifications = cache(async (userId: string): Promise<Notification[]> => {
  const supabase = await createClient()
  const since = new Date(Date.now() - SINCE_DAYS * 86_400_000).toISOString()
  const { data: memberships } = await supabase.from("org_members").select("org:orgs(id, name, org_type)").eq("user_id", userId)
  const orgs = ((memberships ?? []) as unknown as { org: { id: string; name: string; org_type: string } }[]).map((m) => m.org)
  const nonprofits = orgs.filter((o) => o.org_type === "nonprofit").map((o) => o.id)
  const foundations = orgs.filter((o) => o.org_type === "foundation").map((o) => o.id)
  const items: Notification[] = []

  const [toConfirm, confirmed, reports, calls, claims, joined, comments, replies, notes, onMyPosts, hoursLogged, myHours, soon, newCalls] = await Promise.all([
    nonprofits.length
      ? supabase.from("grants").select(`id, amount_usd, created_at, grantee_id, foundation:orgs!grants_foundation_id_fkey(${O})`).in("grantee_id", nonprofits).is("confirmed_at", null).gte("created_at", since)
      : null,
    foundations.length
      ? supabase.from("grants").select(`id, amount_usd, confirmed_at, grantee:orgs!grants_grantee_id_fkey(${O})`).in("foundation_id", foundations).not("confirmed_at", "is", null).gte("confirmed_at", since)
      : null,
    foundations.length
      ? supabase.from("posts").select(`id, created_at, org:orgs!posts_org_id_fkey!inner(${O}), grant:grants!posts_reports_grant_id_fkey!inner(foundation_id)`).in("grant.foundation_id", foundations).gte("created_at", since)
      : null,
    nonprofits.length ? openCallsForCauses(nonprofits, since) : null,
    supabase.from("org_claims").select("id, org_name, status, reviewed_at, org_id").eq("user_id", userId).not("reviewed_at", "is", null).gte("reviewed_at", since),
    orgs.length
      ? supabase.from("org_invites").select("id, email, accepted_at, org_id").in("org_id", orgs.map((o) => o.id)).not("accepted_at", "is", null).neq("accepted_by", userId).gte("accepted_at", since)
      : null,
    // Comments on your org's posts (not your own, not the team's replies).
    orgs.length
      ? supabase.from("comments").select(`id, post_id, body, created_at, author:${P}, post:posts!inner(org_id, body)`).in("post.org_id", orgs.map((o) => o.id)).eq("as_org", false).neq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(30)
      : null,
    repliesToYou(userId, since),
    orgs.length ? supabase.from("thanks").select("id, org_id, created_at").in("org_id", orgs.map((o) => o.id)).neq("user_id", userId).gte("created_at", since) : null,
    // F-079: comments on your own posts.
    supabase.from("comments").select(`id, post_id, body, created_at, author:${P}, post:posts!inner(author_id, org_id, body)`).eq("post.author_id", userId).is("post.org_id", null).neq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    // F-082: volunteer shifts logged with your org, waiting for confirmation.
    orgs.length ? supabase.from("volunteer_hours").select(`id, org_id, hours, created_at, person:${P}`).in("org_id", orgs.map((o) => o.id)).is("confirmed_at", null).is("declined_at", null).gte("created_at", since).order("created_at", { ascending: false }).limit(20) : null,
    // F-089 (donors): your shifts confirmed by the org.
    supabase.from("volunteer_hours").select(`id, hours, confirmed_at, org:orgs(${O})`).eq("user_id", userId).not("confirmed_at", "is", null).gte("confirmed_at", since).order("confirmed_at", { ascending: false }).limit(10),
    // Events you're going to in the next 7 days.
    supabase.from("event_rsvps").select(`event:org_events!inner(id, title, starts_at, org:orgs(${O}))`).eq("user_id", userId).gt("event.starts_at", new Date().toISOString()).lte("event.starts_at", new Date(Date.now() + 7 * 86_400_000).toISOString()),
    // New calls for volunteers or donations from organizations you follow (last 14 days).
    followedCalls(userId),
  ])

  for (const g of (toConfirm?.data ?? []) as unknown as { id: string; amount_usd: number | null; created_at: string; grantee_id: string; foundation: OrgRef }[]) {
    items.push({ key: `confirm-${g.id}`, at: g.created_at, kind: "grant", actor: org(g.foundation), text: `recorded a ${amount(g.amount_usd)}grant to you. Confirm it so it shows publicly.`, href: `/dashboard/${g.grantee_id}`, cta: "Review grant" })
  }
  for (const g of (confirmed?.data ?? []) as unknown as { id: string; amount_usd: number | null; confirmed_at: string; grantee: OrgRef }[]) {
    items.push({ key: `confirmed-${g.id}`, at: g.confirmed_at, kind: "grant", actor: org(g.grantee), text: `confirmed your ${amount(g.amount_usd)}grant.`, href: `/o/${g.grantee.slug}` })
  }
  for (const p of (reports?.data ?? []) as unknown as { id: string; created_at: string; org: OrgRef }[]) {
    items.push({ key: `report-${p.id}`, at: p.created_at, kind: "report", actor: org(p.org), text: "posted a report on your grant.", href: `/p/${p.id}`, cta: "Read report" })
  }
  for (const c of calls ?? []) items.push(c)
  for (const c of claims.data ?? []) {
    const approved = c.status === "approved"
    items.push({ key: `claim-${c.id}`, at: c.reviewed_at!, kind: "claim", text: approved ? `Your claim for ${c.org_name} was approved. Welcome to imnet.` : `Your claim for ${c.org_name} wasn't approved.`, href: approved && c.org_id ? `/dashboard/${c.org_id}` : "/dashboard" })
  }
  for (const i of joined?.data ?? []) {
    items.push({ key: `joined-${i.id}`, at: i.accepted_at!, kind: "team", text: `${i.email} joined your team.`, href: `/dashboard/${i.org_id}` })
  }
  for (const t of notes?.data ?? []) {
    const o = orgs.find((o) => o.id === t.org_id)
    items.push({ key: `thanks-${t.id}`, at: t.created_at, kind: "thanks", text: `A supporter sent ${o ? name(o) : "your team"} a thank-you note.`, href: `/dashboard/${t.org_id}` })
  }
  type C = { id: string; post_id: string; body: string; created_at: string; author: Person; post: { body: string } }
  for (const c of (comments?.data ?? []) as unknown as C[]) {
    items.push({ key: `comment-${c.id}`, at: c.created_at, kind: "comment", actor: person(c.author), text: `commented on your post${about(c.post.body)}`, quote: c.body, href: `/p/${c.post_id}#comments`, cta: "Reply" })
  }
  for (const r of replies) items.push(r)
  for (const c of (onMyPosts?.data ?? []) as unknown as C[]) {
    items.push({ key: `mine-${c.id}`, at: c.created_at, kind: "comment", actor: person(c.author), text: `commented on your post${about(c.post.body)}`, quote: c.body, href: `/p/${c.post_id}#comments`, cta: "Reply" })
  }
  for (const h of (hoursLogged?.data ?? []) as unknown as { id: string; org_id: string; hours: number; created_at: string; person: Person }[]) {
    items.push({ key: `hours-${h.id}`, at: h.created_at, kind: "hours", actor: person(h.person), text: `logged ${Number(h.hours)} volunteer hours with you. Confirm them.`, href: `/dashboard/${h.org_id}`, cta: "Confirm hours" })
  }
  for (const h of (myHours?.data ?? []) as unknown as { id: string; hours: number; confirmed_at: string; org: OrgRef }[]) {
    items.push({ key: `hours-ok-${h.id}`, at: h.confirmed_at, kind: "hours", actor: org(h.org), text: `confirmed your ${Number(h.hours)} volunteer hours.`, href: "/giving#hours" })
  }
  for (const r of (soon?.data ?? []) as unknown as { event: { id: string; title: string; starts_at: string; org: OrgRef } }[]) {
    // Shown as "now" so it sits at the top while the event is coming up.
    const day = new Date(r.event.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    items.push({ key: `soon-${r.event.id}`, at: new Date().toISOString(), kind: "event", actor: org(r.event.org), text: `Coming up: ${r.event.title}, ${day}. You're going.`, href: `/e/${r.event.id}`, cta: "View event" })
  }
  for (const c of newCalls) items.push(c)
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30)
})

async function openCallsForCauses(orgIds: string[], since: string): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: causes } = await supabase.from("org_causes").select("cause_slug").in("org_id", orgIds)
  const slugs = [...new Set((causes ?? []).map((c) => c.cause_slug))]
  if (slugs.length === 0) return []
  const { data } = await supabase
    .from("posts")
    .select(`id, body, created_at, call_deadline, org:orgs!posts_org_id_fkey!inner(${O})`)
    .eq("kind", "open_call")
    .gte("created_at", since)
    .gte("call_deadline", new Date().toISOString().slice(0, 10))
    .or(`call_causes.ov.{${slugs.join(",")}},call_causes.eq.{}`)
  return ((data ?? []) as unknown as { id: string; body: string; created_at: string; call_deadline: string; org: OrgRef }[]).map((c) => ({
    key: `call-${c.id}`,
    at: c.created_at,
    kind: "call" as const,
    actor: org(c.org),
    text: `opened a call in your causes (apply by ${formatDeadline(c.call_deadline)}).`,
    href: `/p/${c.id}`,
    cta: "See the call",
  }))
}

// Someone (or the org's team) replied to one of your comments.
async function repliesToYou(userId: string, since: string): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: mine } = await supabase.from("comments").select("id").eq("user_id", userId).is("parent_id", null).limit(200)
  if (!mine?.length) return []
  const { data } = await supabase
    .from("comments")
    .select(`id, post_id, body, created_at, as_org, author:${P}, parent:parent_id(body), post:posts!inner(org:orgs!posts_org_id_fkey(${O}))`)
    .in("parent_id", mine.map((c) => c.id))
    .neq("user_id", userId)
    .gte("created_at", since)
  type Row = { id: string; post_id: string; body: string; created_at: string; as_org: boolean; author: Person; parent: { body: string } | null; post: { org: OrgRef | null } }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    key: `reply-${r.id}`,
    at: r.created_at,
    kind: "comment" as const,
    actor: r.as_org && r.post.org ? org(r.post.org) : person(r.author),
    text: `replied to your comment${about(r.parent?.body)}`,
    quote: r.body,
    href: `/p/${r.post_id}#comments`,
    cta: "Reply",
  }))
}

// Calls for volunteers or donations posted in the last 14 days by orgs the viewer follows.
async function followedCalls(userId: string): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: follows } = await supabase.from("follows").select("org_id").eq("user_id", userId)
  const ids = (follows ?? []).map((f) => f.org_id)
  if (ids.length === 0) return []
  const { data } = await supabase
    .from("posts")
    .select(`id, kind, created_at, org_id, org:orgs!posts_org_id_fkey!inner(${O})`)
    .in("org_id", ids)
    .in("kind", ["call_volunteers", "call_donations"])
    .gte("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
  type Row = { id: string; kind: string; created_at: string; org_id: string; org: OrgRef }
  const rows = (data ?? []) as unknown as Row[]
  // F-090: who already volunteers with each org asking for volunteers (confirmed and opted in).
  const askers = [...new Set(rows.filter((p) => p.kind === "call_volunteers").map((p) => p.org_id))]
  const crews = new Map(await Promise.all(askers.map(async (id) => {
    const { data: v } = await supabase.rpc("org_volunteers", { target: id })
    return [id, (v ?? []) as { id: string; handle: string; display_name: string | null; avatar_url: string | null; total: number }[]] as const
  })))
  return rows.map((p) => {
    const vol = p.kind === "call_volunteers"
    const crew = crews.get(p.org_id) ?? []
    return {
      key: `newcall-${p.id}`, at: p.created_at, kind: "call" as const, actor: org(p.org), text: `is asking for ${vol ? "volunteers" : "donations"}.`, href: `/p/${p.id}`, cta: vol ? "Volunteer" : "Donate",
      volunteers: crew.length ? { people: crew.map((c) => ({ name: c.id === userId ? "You" : (c.display_name ?? `@${c.handle}`), avatar_url: c.avatar_url })), total: Number(crew[0].total) } : undefined,
    }
  })
}

export async function hasUnread(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const [{ data: profile }, items] = await Promise.all([
    supabase.from("profiles").select("notifications_seen_at").eq("id", userId).single(),
    getNotifications(userId),
  ])
  const seen = profile?.notifications_seen_at
  return items.some((n) => !seen || n.at > seen)
}
