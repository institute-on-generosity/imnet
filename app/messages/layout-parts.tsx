import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { CONTAINER } from "@/components/shell"
import type { ConversationCard } from "@/lib/queries"
import { cn } from "@/lib/utils"

const when = (iso: string) => {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// F-100: LinkedIn-style messaging: conversations on the left, the open thread on the right. On
// phones the list and the thread are separate screens.
export function MessagesShell({ conversations, activeId, children }: { conversations: ConversationCard[]; activeId?: string; children: React.ReactNode }) {
  return (
    <div className={cn(CONTAINER, "grid grid-cols-1 gap-0 md:grid-cols-[320px_minmax(0,1fr)]")}>
      <section aria-labelledby="messaging" className={cn("min-w-0 rounded-xl border bg-card md:rounded-r-none", activeId && "max-md:hidden")}>
        <h1 id="messaging" className="h-section border-b px-4 py-3">Messaging</h1>
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No conversations yet. Message someone from a community you&apos;re in, or someone who follows you.</p>
        ) : (
          <ul className="max-h-[calc(100dvh-180px)] divide-y overflow-y-auto">
            {conversations.map((c) => {
              const name = c.other.display_name ?? `@${c.other.handle}`
              return (
                <li key={c.id}>
                  <Link href={`/messages/${c.id}`} aria-current={c.id === activeId ? "page" : undefined}
                    className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/50", c.id === activeId && "bg-leaf-soft/50 shadow-[inset_3px_0_0_var(--leaf)]")}>
                    <PersonAvatar name={name} avatarUrl={c.other.avatar_url} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate", c.unread ? "font-bold" : "font-semibold")}>{name}</span>
                        {c.last && <time dateTime={c.last.at} className="shrink-0 text-xs text-faint">{when(c.last.at)}</time>}
                      </p>
                      <p className={cn("truncate text-sm", c.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {c.last ? `${c.last.mine ? "You: " : ""}${c.last.body}` : "No messages yet"}
                      </p>
                    </div>
                    {c.unread && <span className="size-2 shrink-0 rounded-full bg-leaf" aria-label="Unread" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <section className={cn("min-w-0 rounded-xl border bg-card md:rounded-l-none md:border-l-0", !activeId && "max-md:hidden")}>{children}</section>
    </div>
  )
}
