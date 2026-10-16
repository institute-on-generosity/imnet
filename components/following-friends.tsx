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

// F-114/F-117: what people you follow just did, one row each: who, what, where, when, their note.
// Only what they shared with their followers (experiences); private journal gifts never show.
export function FriendsActivity({ items }: { items: FriendExperience[] }) {
  if (items.length === 0) return null
  return (
    <Panel aria-labelledby="friends-activity">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h2 id="friends-activity" className="h-section">What your friends are up to</h2>
        <p className="text-xs text-faint">Shared with their followers</p>
      </div>
      <ul className="divide-y">
        {items.map((e) => {
          const name = e.person.display_name ?? `@${e.person.handle}`
          return (
            <li key={e.id} className="group relative flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
              <span className="relative shrink-0">
                <PersonAvatar name={name} avatarUrl={e.person.avatar_url} size="md" />
                <span className="absolute -right-1 -bottom-1 rounded-md ring-2 ring-card"><OrgMark org={e.org} size="xs" /></span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <Link href={`/u/${e.person.handle}`} className="relative z-10 font-semibold hover:underline">{name}</Link>
                  {e.person.public_figure && <BadgeCheck className="ml-1 inline size-3.5 text-amber-700" aria-label="Public figure" />}{" "}
                  <span className={e.kind === "gave" ? "font-medium text-amber-800" : e.kind === "volunteered" ? "font-medium text-leaf" : "text-muted-foreground"}>{VERB[e.kind]}</span>{" "}
                  <Link href={`/o/${e.org.slug}`} className="font-semibold after:absolute after:inset-0 group-hover:underline">{e.org.name}</Link>
                </p>
                {e.note && <p className="truncate text-xs text-muted-foreground">&ldquo;{e.note}&rdquo;</p>}
              </div>
              <span className="shrink-0 text-xs text-faint" suppressHydrationWarning>{ago(e.created_at)}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
