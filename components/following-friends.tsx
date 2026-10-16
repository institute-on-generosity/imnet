import { BadgeCheck } from "lucide-react"
import Link from "@/components/intent-link"
import type { FriendExperience } from "@/lib/queries"
import { OrgMark } from "./org-mark"
import { PersonAvatar } from "./person-avatar"
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
