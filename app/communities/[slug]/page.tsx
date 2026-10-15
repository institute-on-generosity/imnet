import { LogOut, MessageSquare, UserPlus } from "lucide-react"
import { notFound } from "next/navigation"
import { joinGroup, leaveGroup, startConversation } from "@/app/actions"
import { ChatThread } from "@/components/chat-thread"
import { CommunityMark } from "@/components/community-mark"
import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { Panel, TwoColumn } from "@/components/shell"
import { Button, buttonVariants } from "@/components/ui/button"
import { getCauses, getGroupBySlug, getGroupMembers, getMessages } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export async function generateMetadata({ params }: PageProps<"/communities/[slug]">) {
  const { slug } = await params
  const data = await getGroupBySlug(slug, null)
  return { title: data?.group.name ?? "Community" }
}

// F-100: a group: what it's for, who's in it, and its members-only chat.
export default async function GroupPage({ params, searchParams }: PageProps<"/communities/[slug]">) {
  const { slug } = await params
  const { tab: rawTab } = await searchParams
  const userId = await getUserId()
  const data = await getGroupBySlug(slug, userId)
  if (!data) notFound()
  const { group, members, role } = data
  // Members get Chat and Members tabs; everyone else sees who's in it and a Join button.
  const tab = !role ? "preview" : rawTab === "members" ? "members" : "chat"
  const [people, messages, causes] = await Promise.all([
    tab !== "chat" ? getGroupMembers(group.id) : Promise.resolve([]),
    role ? getMessages({ group: group.id }) : Promise.resolve([]),
    getCauses(),
  ])
  const cause = causes.find((c) => c.slug === group.cause_slug)
  const memberLabel = `${members.toLocaleString("en-US")} ${members === 1 ? "member" : "members"}`

  return (
    <TwoColumn
      right={
        <Panel className="p-4">
          <h2 className="h-rail">About this community</h2>
          {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
          <p className="mt-2 text-xs text-faint">Anyone can join. Members see each other and the chat.</p>
          {role === "member" && (
            <form action={leaveGroup.bind(null, group.id, group.slug)} className="mt-3">
              <Button type="submit" variant="outline" size="sm"><LogOut aria-hidden />Leave community</Button>
            </form>
          )}
        </Panel>
      }
    >
      <Panel>
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <CommunityMark cause={group.cause_slug} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="h-page">{group.name}</h1>
            <p className="mt-1 text-sm text-faint">{[cause?.name, memberLabel].filter(Boolean).join(" · ")}</p>
          </div>
          {!role && (
            userId ? (
              <form action={joinGroup.bind(null, group.id, group.slug)}><Button type="submit"><UserPlus aria-hidden />Join</Button></form>
            ) : (
              <Link href={`/login?next=/communities/${group.slug}`} className={buttonVariants()}><UserPlus aria-hidden />Join</Link>
            )
          )}
        </div>
        {role && (
          <nav aria-label="Community sections" className="flex border-t px-2 sm:px-3">
            {(["chat", "members"] as const).map((t) => (
              <Link key={t} href={`/communities/${group.slug}${t === "chat" ? "" : "?tab=members"}`} aria-current={tab === t ? "page" : undefined}
                className={cn("border-b-2 px-3 py-3 text-sm font-semibold", tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {t === "chat" ? "Chat" : `Members · ${members}`}
              </Link>
            ))}
          </nav>
        )}
      </Panel>

      {role && tab === "chat" && userId && (
        <Panel className="overflow-hidden">
          <ChatThread target={{ group: group.id }} initial={messages} viewerId={userId} placeholder={`Message ${group.name}`} className="h-[min(68dvh,640px)]" />
        </Panel>
      )}

      {tab !== "chat" && (
        <Panel aria-labelledby="members">
          <h2 id="members" className="h-section border-b px-4 py-3">{role ? "Members" : `${memberLabel}. Join to read and post in the chat.`}</h2>
          <ul className="divide-y">
            {people.map((p) => {
              const name = p.display_name ?? `@${p.handle}`
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <PersonAvatar name={name} avatarUrl={p.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <Link href={`/u/${p.handle}`} className="truncate font-semibold hover:underline">{name}</Link>
                      {p.role === "owner" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Owner</span>}
                    </p>
                    {p.bio && <p className="truncate text-sm text-muted-foreground">{p.bio}</p>}
                  </div>
                  {role && userId && p.id !== userId && (
                    <form action={startConversation.bind(null, p.id)}>
                      <Button type="submit" variant="outline" size="sm"><MessageSquare aria-hidden />Message<span className="sr-only"> {name}</span></Button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </TwoColumn>
  )
}
