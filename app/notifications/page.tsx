import { BadgeCheck, CalendarDays, Sparkles, Clock, FileText, HandCoins, HeartHandshake, Megaphone, MessageCircle, UserPlus } from "lucide-react"
import Link from "@/components/intent-link"
import { redirect } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { LocalTime } from "@/components/local-time"
import { PersonAvatar } from "@/components/person-avatar"
import { Panel, TwoColumn } from "@/components/shell"
import { getNotifications, type Notification } from "@/lib/notifications"
import { createClient, getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { MarkSeen } from "./mark-seen"

export const metadata = { title: "Notifications" }

const ICONS = { grant: HandCoins, report: FileText, call: Megaphone, team: UserPlus, claim: BadgeCheck, thanks: HeartHandshake, comment: MessageCircle, hours: Clock, event: CalendarDays, impact: Sparkles }
const FILTERS = {
  all: { label: "All", kinds: null },
  comments: { label: "Comments", kinds: ["comment"] },
  calls: { label: "Calls to help", kinds: ["call"] },
  events: { label: "Events", kinds: ["event"] },
  impact: { label: "Your impact", kinds: ["impact"] },
  hours: { label: "Volunteering", kinds: ["hours"] },
  grants: { label: "Grants", kinds: ["grant", "report"] },
} as const satisfies Record<string, { label: string; kinds: readonly Notification["kind"][] | null }>
type Filter = keyof typeof FILTERS

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return mins < 1 ? "now" : `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  if (mins < 7 * 1440) return `${Math.round(mins / 1440)}d`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// A calm inbox, laid out like LinkedIn's: who, what, one next step. No counts, no streaks.
export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/notifications")
  const { f } = await searchParams
  const supabase = await createClient()
  const [all, { data: profile }] = await Promise.all([getNotifications(userId), supabase.from("profiles").select("notifications_seen_at").eq("id", userId).single()])
  const seen = profile?.notifications_seen_at ?? null
  // Only offer filters that have something in them.
  const present = (Object.keys(FILTERS) as Filter[]).filter((k) => k === "all" || all.some((n) => (FILTERS[k].kinds as readonly string[] | null)?.includes(n.kind)))
  const filter: Filter = typeof f === "string" && present.includes(f as Filter) ? (f as Filter) : "all"
  const kinds = FILTERS[filter].kinds as readonly string[] | null
  const items = kinds ? all.filter((n) => kinds.includes(n.kind)) : all

  return (
    <TwoColumn>
      <MarkSeen />
      <Panel>
        <div className="border-b px-4 pt-3 pb-3">
          <h1 className="h-page">Notifications</h1>
          {present.length > 1 && (
            <nav aria-label="Filter notifications" className="mt-3 flex gap-2 overflow-x-auto">
              {present.map((k) => (
                <Link key={k} href={k === "all" ? "/notifications" : `/notifications?f=${k}`} aria-current={filter === k ? "page" : undefined}
                  className={cn("shrink-0 rounded-full border px-3 py-1 text-sm font-semibold", filter === k ? "border-leaf bg-leaf text-white" : "text-muted-foreground hover:bg-muted")}>
                  {FILTERS[k].label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nothing new. Comments, replies, calls from orgs you follow, events and confirmed hours show up here.</p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => <Row key={n.key} n={n} unread={!seen || n.at > seen} />)}
          </ul>
        )}
      </Panel>
    </TwoColumn>
  )
}

function Row({ n, unread }: { n: Notification; unread: boolean }) {
  const Icon = ICONS[n.kind]
  return (
    <li className={cn(unread && "bg-leaf-soft/50")}>
      <Link href={n.href} className="flex items-start gap-3 px-4 py-4 hover:bg-muted/50">
        <span className="relative mt-0.5 shrink-0">
          {n.actor?.type === "person" ? (
            <PersonAvatar name={n.actor.name} avatarUrl={n.actor.avatar_url} size="lg" />
          ) : n.actor?.type === "org" ? (
            <OrgMark org={n.actor} size="md" />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden /></span>
          )}
          {n.actor && (
            <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-leaf text-white ring-2 ring-card" aria-hidden>
              <Icon className="size-3" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug">
            {n.actor && <><span className="font-semibold">{n.actor.name}</span> </>}
            {n.text}
            {n.eventAt && <> <span className="text-muted-foreground"><LocalTime iso={n.eventAt} /></span></>}
          </span>
          {n.quote && <span className="mt-2 line-clamp-3 rounded-lg bg-muted px-3 py-2 text-sm">{n.quote}</span>}
          {n.volunteers && <Crew {...n.volunteers} />}
          {n.cta && (
            <span className="mt-2 inline-flex rounded-full border border-foreground/30 px-3 py-1 text-xs font-semibold">{n.cta}</span>
          )}
        </span>
        <time className="shrink-0 text-xs text-faint" dateTime={n.at}>{ago(n.at)}</time>
        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-leaf" aria-label="New" />}
      </Link>
    </li>
  )
}

// F-090: "Lena Hale, Kwame Nguyen and 4 others have volunteered here" (confirmed hours, opted in).
function Crew({ people, total }: NonNullable<Notification["volunteers"]>) {
  const named = people.slice(0, 2).map((p) => p.name)
  const rest = total - named.length
  const who = rest > 0 ? `${named.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}` : named.join(" and ")
  return (
    <span className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex -space-x-1.5" aria-hidden>
        {people.map((p) => <PersonAvatar key={p.name} name={p.name} avatarUrl={p.avatar_url} size="xs" className="ring-2 ring-card" />)}
      </span>
      <span>{who} {total === 1 ? "has" : "have"} volunteered here</span>
    </span>
  )
}
