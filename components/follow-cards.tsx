import { BadgeCheck } from "lucide-react"
import Link from "@/components/intent-link"
import { orgCoverSrc } from "@/lib/cover"
import type { FriendSuggestion, NotableGiver, OrgSummaryWithMission } from "@/lib/queries"
import { FoundationMark } from "./org-type-badge"
import { OrgMark } from "./org-mark"
import { FollowButton } from "./follow-button"
import { PersonAvatar } from "./person-avatar"

// F-116: suggestions as one Pinterest-style wall: organizations, friends and notable givers mixed,
// cards of natural height in columns. Causes stay in their own grid above.
export type WallOrg = OrgSummaryWithMission & { id: string; cover_url?: string | null; location?: string | null }
export type WallItem = { kind: "org"; org: WallOrg } | { kind: "friend"; s: FriendSuggestion } | { kind: "notable"; g: NotableGiver; following: boolean }

// Interleave so no two cards of the same kind sit together for long.
export function mixWall(orgs: WallOrg[], friends: FriendSuggestion[], notable: { g: NotableGiver; following: boolean }[]): WallItem[] {
  const lanes: WallItem[][] = [orgs.map((org) => ({ kind: "org", org })), friends.map((s) => ({ kind: "friend", s })), notable.map((n) => ({ kind: "notable", ...n }))]
  const out: WallItem[] = []
  for (let i = 0; lanes.some((l) => i < l.length); i++) for (const lane of lanes) if (lane[i]) out.push(lane[i])
  return out
}

export function SuggestionWall({ items }: { items: WallItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="suggested-for-you" className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="suggested-for-you" className="text-sm font-semibold">Suggested for you</h2>
        <Link href="/givers" className="text-sm font-semibold text-leaf hover:underline">Notable givers</Link>
      </div>
      <ul className="columns-2 gap-3 sm:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid">
        {items.map((it) => it.kind === "org" ? <OrgTile key={`o-${it.org.id}`} org={it.org} /> : it.kind === "friend" ? <PersonTile key={`f-${it.s.id}`} s={it.s} /> : <NotableTile key={`n-${it.g.id}`} g={it.g} following={it.following} />)}
      </ul>
    </section>
  )
}

function OrgTile({ org }: { org: WallOrg }) {
  const cover = orgCoverSrc(org.cover_url)
  return (
    <li className="overflow-hidden rounded-xl border bg-card">
      <Link href={`/o/${org.slug}`} tabIndex={-1} aria-hidden className="block">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className={org.org_type === "foundation" ? "aspect-[4/3] bg-primary" : "aspect-[4/3] bg-leaf-soft"} />
        )}
      </Link>
      <div className="relative px-3 pb-3">
        <span className="-mt-6 mb-1 block w-fit rounded-xl ring-2 ring-card"><OrgMark org={org} size="md" /></span>
        <p className="flex items-center gap-1.5"><Link href={`/o/${org.slug}`} className="font-semibold leading-snug hover:underline">{org.name}</Link>{org.org_type === "foundation" && <FoundationMark />}</p>
        <p className="text-xs text-faint">{org.org_type === "foundation" ? "Foundation" : "Nonprofit"}{org.location ? ` · ${org.location}` : ""}</p>
        {org.mission && <p className="mt-1.5 line-clamp-4 text-sm text-muted-foreground">{org.mission}</p>}
        <div className="mt-3 [&_button]:w-full"><FollowButton orgId={org.id} orgName={org.name} following={false} secondary /></div>
      </div>
    </li>
  )
}

function PersonTile({ s }: { s: FriendSuggestion }) {
  const name = s.display_name ?? `@${s.handle}`
  return (
    <li className="rounded-xl border bg-card p-4 text-center">
      <Link href={`/u/${s.handle}`} tabIndex={-1} aria-hidden className="inline-block"><PersonAvatar name={name} avatarUrl={s.avatar_url} size="xl" className="size-20 sm:size-20" /></Link>
      <Link href={`/u/${s.handle}`} className="mt-2 block font-semibold hover:underline">{name}</Link>
      <p className="text-xs font-medium text-leaf">{s.reason}</p>
      {s.bio && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.bio}</p>}
      <div className="mt-3 [&_button]:w-full"><FollowButton orgId={s.id} orgName={name} following={false} person secondary /></div>
    </li>
  )
}

function NotableTile({ g, following }: { g: NotableGiver; following: boolean }) {
  const name = g.display_name ?? `@${g.handle}`
  return (
    <li className="rounded-xl border border-marigold/40 bg-gradient-to-b from-marigold-soft/60 to-card p-4">
      <div className="text-center">
        <Link href={`/u/${g.handle}`} tabIndex={-1} aria-hidden className="inline-block"><PersonAvatar name={name} avatarUrl={g.avatar_url} size="xl" className="size-20 sm:size-20" /></Link>
        <Link href={`/u/${g.handle}`} className="mt-2 block font-semibold hover:underline">{name}</Link>
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><BadgeCheck className="size-3.5" aria-hidden />{g.public_figure_note ?? "Public figure"}</p>
      </div>
      {g.givesTo.length > 0 ? (
        <div className="mt-3 border-t border-marigold/30 pt-2">
          <p className="text-[11px] text-faint">Gives to</p>
          <ul className="mt-1 space-y-1">
            {g.givesTo.slice(0, 3).map((o) => <li key={o.id}><Link href={`/o/${o.slug}`} className="flex items-center gap-1.5 text-xs hover:underline"><OrgMark org={o} size="xs" /><span className="truncate">{o.name}</span></Link></li>)}
          </ul>
        </div>
      ) : <p className="mt-2 text-center text-xs text-faint">Keeps their giving private</p>}
      <div className="mt-3 [&_button]:w-full"><FollowButton orgId={g.id} orgName={name} following={following} person secondary /></div>
    </li>
  )
}
