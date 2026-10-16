import { BadgeCheck } from "lucide-react"
import Link from "@/components/intent-link"
import type { FriendSuggestion, NotableGiver } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { PersonAvatar } from "./person-avatar"

// F-115: a horizontally scrolling row of people to follow, like a social app's onboarding.
export function FollowRow({ id, title, subtitle, more, children }: { id: string; title: string; subtitle: string; more?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <h2 id={id} className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-faint">{subtitle}</p>
        </div>
        {more && <Link href={more.href} className="shrink-0 text-sm font-semibold text-leaf hover:underline">{more.label}</Link>}
      </div>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">{children}</ul>
    </section>
  )
}

function Card({ handle, name, avatar, line1, line2, id, following }: { handle: string; name: string; avatar: string | null; line1: React.ReactNode; line2?: string | null; id: string; following: boolean }) {
  return (
    <li className="flex w-44 shrink-0 snap-start flex-col items-center rounded-xl border bg-card p-4 text-center">
      <Link href={`/u/${handle}`} tabIndex={-1} aria-hidden><PersonAvatar name={name} avatarUrl={avatar} size="xl" className="size-20 sm:size-20" /></Link>
      <Link href={`/u/${handle}`} className="mt-2 line-clamp-1 font-semibold hover:underline">{name}</Link>
      <div className="mt-0.5 line-clamp-1 text-xs">{line1}</div>
      {line2 && <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">{line2}</p>}
      <div className="mt-auto w-full pt-3 [&>button]:w-full [&_button]:w-full"><FollowButton orgId={id} orgName={name} following={following} person secondary /></div>
    </li>
  )
}

export function FriendCard({ s }: { s: FriendSuggestion }) {
  const name = s.display_name ?? `@${s.handle}`
  return <Card id={s.id} handle={s.handle} name={name} avatar={s.avatar_url} following={false} line1={<span className="font-medium text-leaf">{s.reason}</span>} line2={s.bio} />
}

export function NotableCard({ g, following }: { g: NotableGiver; following: boolean }) {
  const name = g.display_name ?? `@${g.handle}`
  return (
    <Card id={g.id} handle={g.handle} name={name} avatar={g.avatar_url} following={following}
      line1={<span className="inline-flex items-center gap-1 font-semibold text-amber-800"><BadgeCheck className="size-3.5" aria-hidden />{g.public_figure_note ?? "Public figure"}</span>}
      line2={g.givesTo.length ? `Gives to ${g.givesTo.map((o) => o.name).join(", ")}` : "Keeps their giving private"} />
  )
}
