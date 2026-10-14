import { BadgeCheck, FileText, HandCoins, HeartHandshake, Megaphone, MessageCircle, UserPlus } from "lucide-react"
import Link from "@/components/intent-link"
import { redirect } from "next/navigation"
import { Panel, TwoColumn } from "@/components/shell"
import { getNotifications } from "@/lib/notifications"
import { getUserId } from "@/lib/supabase/server"
import { MarkSeen } from "./mark-seen"

export const metadata = { title: "Notifications" }

const ICONS = { grant: HandCoins, report: FileText, call: Megaphone, team: UserPlus, claim: BadgeCheck, thanks: HeartHandshake, comment: MessageCircle }
const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// A calm inbox: things that need you or that you'd want to know. No counts, no streaks.
export default async function NotificationsPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/notifications")
  const items = await getNotifications(userId)

  return (
    <TwoColumn>
      <MarkSeen />
      <Panel>
        <h1 className="border-b px-4 py-3 font-sans text-lg font-semibold tracking-normal">Notifications</h1>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nothing new. Grants, reports, calls, comments, notes and team changes show up here.</p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => {
              const Icon = ICONS[n.kind]
              return (
                <li key={n.key}>
                  <Link href={n.href} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{n.text}</span>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={n.at}>{when(n.at)}</time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </TwoColumn>
  )
}
