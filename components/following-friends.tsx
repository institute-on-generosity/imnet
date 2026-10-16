import { BadgeCheck } from "lucide-react"
import Link from "@/components/intent-link"
import type { FriendExperience, NotableGiver } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { OrgMark } from "./org-mark"
import { PersonAvatar } from "./person-avatar"
import { RailHeading } from "./rail-cards"
import { Panel } from "./shell"

const VERB = { volunteered: "volunteered at", gave: "gave to", attended: "went to an event at" } as const
const ago = (iso: string) => {
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000)
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// F-114: what people you follow have done lately, so the People tab is about their giving, not a list.
export function FriendsActivity({ items }: { items: FriendExperience[] }) {
  if (items.length === 0) return null
  return (
    <Panel aria-labelledby="friends-activity">
      <div className="border-b px-4 py-3">
        <h2 id="friends-activity" className="h-section">Recently from people you follow</h2>
        <p className="text-xs text-faint">Experiences they shared with their followers</p>
      </div>
      <ul className="divide-y">
        {items.map((e) => {
          const name = e.person.display_name ?? `@${e.person.handle}`
          return (
            <li key={e.id} className="flex gap-3 px-4 py-3">
              <Link href={`/u/${e.person.handle}`} tabIndex={-1} aria-hidden><PersonAvatar name={name} avatarUrl={e.person.avatar_url} size="md" /></Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/u/${e.person.handle}`} className="font-semibold hover:underline">{name}</Link>
                  {e.person.public_figure && <BadgeCheck className="ml-1 inline size-3.5 text-amber-700" aria-label="Public figure" />}{" "}
                  <span className="text-muted-foreground">{VERB[e.kind]}</span>{" "}
                  <Link href={`/o/${e.org.slug}`} className="font-semibold hover:underline">{e.org.name}</Link>
                  <span className="text-faint" suppressHydrationWarning> · {ago(e.created_at)}</span>
                </p>
                {e.note && <p className="story mt-1 text-[0.95rem] leading-snug">&ldquo;{e.note}&rdquo;</p>}
              </div>
              <Link href={`/o/${e.org.slug}`} tabIndex={-1} aria-hidden className="shrink-0"><OrgMark org={e.org} size="sm" /></Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// F-114: public figures you don't follow yet, with who they give to.
export function NotableToFollow({ givers }: { givers: NotableGiver[] }) {
  if (givers.length === 0) return null
  return (
    <Panel aria-labelledby="notable-follow" className="p-4">
      <RailHeading id="notable-follow">Notable givers to follow</RailHeading>
      <ul className="mt-2 divide-y">
        {givers.map((g) => {
          const name = g.display_name ?? `@${g.handle}`
          return (
            <li key={g.id} className="flex items-center gap-2.5 py-2.5">
              <PersonAvatar name={name} avatarUrl={g.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${g.handle}`} className="block truncate text-sm font-semibold hover:underline">{name}</Link>
                <p className="truncate text-xs text-muted-foreground">
                  {g.public_figure_note}{g.givesTo[0] ? ` · gives to ${g.givesTo[0].name}` : ""}
                </p>
              </div>
              <FollowButton orgId={g.id} orgName={name} following={false} person variant="icon" />
            </li>
          )
        })}
      </ul>
      <Link href="/givers" className="mt-1 block border-t pt-2.5 text-sm font-semibold text-leaf hover:underline">See all notable givers</Link>
    </Panel>
  )
}
