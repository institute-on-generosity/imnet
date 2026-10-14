import "server-only"
import { formatUsd } from "@/lib/grants"
import { formatDeadline } from "@/lib/open-calls"
import { createClient } from "@/lib/supabase/server"

export type Notification = { key: string; at: string; text: string; href: string; kind: "grant" | "report" | "call" | "team" | "claim" }

const SINCE_DAYS = 60
const name = (o: { name: string } | null | undefined) => o?.name ?? "An organization"
const amount = (n: number | null) => (n ? `${formatUsd(n)} ` : "")

// Everything here runs under the viewer's RLS, so it only ever shows what they may see.
export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - SINCE_DAYS * 86_400_000).toISOString()
  const { data: memberships } = await supabase.from("org_members").select("org:orgs(id, name, org_type)").eq("user_id", userId)
  const orgs = ((memberships ?? []) as unknown as { org: { id: string; name: string; org_type: string } }[]).map((m) => m.org)
  const nonprofits = orgs.filter((o) => o.org_type === "nonprofit").map((o) => o.id)
  const foundations = orgs.filter((o) => o.org_type === "foundation").map((o) => o.id)
  const items: Notification[] = []

  const [toConfirm, confirmed, reports, calls, claims, joined] = await Promise.all([
    nonprofits.length
      ? supabase.from("grants").select("id, amount_usd, created_at, grantee_id, foundation:orgs!grants_foundation_id_fkey(name)").in("grantee_id", nonprofits).is("confirmed_at", null).gte("created_at", since)
      : null,
    foundations.length
      ? supabase.from("grants").select("id, amount_usd, confirmed_at, grantee:orgs!grants_grantee_id_fkey(name, slug)").in("foundation_id", foundations).not("confirmed_at", "is", null).gte("confirmed_at", since)
      : null,
    foundations.length
      ? supabase.from("posts").select("id, created_at, org:orgs!inner(name), grant:grants!posts_reports_grant_id_fkey!inner(foundation_id)").in("grant.foundation_id", foundations).gte("created_at", since)
      : null,
    nonprofits.length ? openCallsForCauses(nonprofits, since) : null,
    supabase.from("org_claims").select("id, org_name, status, reviewed_at, org_id").eq("user_id", userId).not("reviewed_at", "is", null).gte("reviewed_at", since),
    orgs.length
      ? supabase.from("org_invites").select("id, email, accepted_at, org_id").in("org_id", orgs.map((o) => o.id)).not("accepted_at", "is", null).neq("accepted_by", userId).gte("accepted_at", since)
      : null,
  ])

  for (const g of (toConfirm?.data ?? []) as unknown as { id: string; amount_usd: number | null; created_at: string; grantee_id: string; foundation: { name: string } }[]) {
    items.push({ key: `confirm-${g.id}`, at: g.created_at, kind: "grant", text: `${name(g.foundation)} recorded a ${amount(g.amount_usd)}grant to you. Confirm it so it shows publicly.`, href: `/dashboard/${g.grantee_id}` })
  }
  for (const g of (confirmed?.data ?? []) as unknown as { id: string; amount_usd: number | null; confirmed_at: string; grantee: { name: string; slug: string } }[]) {
    items.push({ key: `confirmed-${g.id}`, at: g.confirmed_at, kind: "grant", text: `${name(g.grantee)} confirmed your ${amount(g.amount_usd)}grant.`, href: `/o/${g.grantee.slug}` })
  }
  for (const p of (reports?.data ?? []) as unknown as { id: string; created_at: string; org: { name: string } }[]) {
    items.push({ key: `report-${p.id}`, at: p.created_at, kind: "report", text: `${name(p.org)} posted a report on your grant.`, href: `/p/${p.id}` })
  }
  for (const c of calls ?? []) items.push(c)
  for (const c of claims.data ?? []) {
    const approved = c.status === "approved"
    items.push({ key: `claim-${c.id}`, at: c.reviewed_at!, kind: "claim", text: approved ? `Your claim for ${c.org_name} was approved. Welcome to imnet.` : `Your claim for ${c.org_name} wasn't approved.`, href: approved && c.org_id ? `/dashboard/${c.org_id}` : "/dashboard" })
  }
  for (const i of joined?.data ?? []) {
    items.push({ key: `joined-${i.id}`, at: i.accepted_at!, kind: "team", text: `${i.email} joined your team.`, href: `/dashboard/${i.org_id}` })
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30)
}

async function openCallsForCauses(orgIds: string[], since: string): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: causes } = await supabase.from("org_causes").select("cause_slug").in("org_id", orgIds)
  const slugs = [...new Set((causes ?? []).map((c) => c.cause_slug))]
  if (slugs.length === 0) return []
  const { data } = await supabase
    .from("posts")
    .select("id, body, created_at, call_deadline, org:orgs!inner(name)")
    .eq("kind", "open_call")
    .gte("created_at", since)
    .gte("call_deadline", new Date().toISOString().slice(0, 10))
    .or(`call_causes.ov.{${slugs.join(",")}},call_causes.eq.{}`)
  return ((data ?? []) as unknown as { id: string; body: string; created_at: string; call_deadline: string; org: { name: string } }[]).map((c) => ({
    key: `call-${c.id}`,
    at: c.created_at,
    kind: "call" as const,
    text: `${name(c.org)} opened a call in your causes (apply by ${formatDeadline(c.call_deadline)}).`,
    href: `/p/${c.id}`,
  }))
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
