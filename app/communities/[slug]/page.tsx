import { Lock, LogOut, MessageSquare, UserPlus } from "lucide-react"
import { notFound } from "next/navigation"
import { joinGroup, leaveGroup, startConversation } from "@/app/actions"
import { ChatThread } from "@/components/chat-thread"
import { CommunityMark } from "@/components/community-mark"
import { IconTip } from "@/components/icon-tip"
import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { CONTAINER, Panel } from "@/components/shell"
import { getCauses, getGroupBySlug, getGroupMembers, getMessages } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export async function generateMetadata({ params }: PageProps<"/communities/[slug]">) {
  const { slug } = await params
  const data = await getGroupBySlug(slug, null)
  return { title: data?.group.name ?? "Community" }
}

// F-100/F-104: a community: its chat in the middle, who's in it beside it (no tabs to switch).
export default async function CommunityPage({ params }: PageProps<"/communities/[slug]">) {
  const { slug } = await params
  const userId = await getUserId()
  const data = await getGroupBySlug(slug, userId)
  if (!data) notFound()
  const { group, members, role } = data
  const [people, messages, causes] = await Promise.all([getGroupMembers(group.id), role ? getMessages({ group: group.id }) : Promise.resolve([]), getCauses()])
  const cause = causes.find((c) => c.slug === group.cause_slug)
  const memberLabel = `${members.toLocaleString("en-US")} ${members === 1 ? "member" : "members"}`
  const join = userId ? (
    <form action={joinGroup.bind(null, group.id, group.slug)}><Button type="submit"><UserPlus aria-hidden />Join community</Button></form>
  ) : (
    <Link href={`/login?next=/communities/${group.slug}`} className={buttonVariants()}><UserPlus aria-hidden />Join community</Link>
  )

  return (
    <div className={`${CONTAINER} grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]`}>
      <div className="min-w-0 space-y-3">
        <Panel className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <CommunityMark cause={group.cause_slug} icon={group.icon_path} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="h-page">{group.name}</h1>
            <p className="mt-1 text-sm text-faint">{[cause?.name, group.location, memberLabel].filter(Boolean).join(" · ")}</p>
          </div>
          {!role && join}
        </Panel>

        {role && userId ? (
          <Panel className="overflow-hidden" aria-label="Community chat">
            <ChatThread target={{ group: group.id }} initial={messages} viewerId={userId} placeholder={`Message ${group.name}`} className="h-[min(72dvh,700px)]" />
          </Panel>
        ) : (
          <Panel className="grid place-items-center px-6 py-14 text-center">
            <Lock className="size-6 text-faint" aria-hidden />
            <p className="mt-3 h-section">The chat is for members</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Join to read the conversation and post. You can leave anytime.</p>
            <div className="mt-4">{join}</div>
          </Panel>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <Panel className="p-4">
          <h2 className="h-rail">About</h2>
          {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
          <p className="mt-2 text-xs text-faint">Anyone can join. Members see each other and the chat.</p>
        </Panel>

        <Panel aria-labelledby="members">
          <h2 id="members" className="flex items-baseline justify-between border-b px-4 py-3">
            <span className="h-rail">Members</span><span className="text-sm text-faint">{members.toLocaleString("en-US")}</span>
          </h2>
          {/* Member lists are for signed-in people (decision 0017). */}
          {!userId && <p className="px-4 py-4 text-sm text-muted-foreground"><Link href={`/login?next=/communities/${group.slug}`} className="font-semibold text-leaf hover:underline">Sign in</Link> to see who&apos;s in it.</p>}
          <ul className="max-h-[min(56dvh,520px)] divide-y overflow-y-auto">
            {people.map((p) => {
              const name = p.id === userId ? "You" : (p.display_name ?? `@${p.handle}`)
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                  <PersonAvatar name={name} avatarUrl={p.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm">
                      <Link href={`/u/${p.handle}`} className="truncate font-semibold hover:underline">{name}</Link>
                      {p.role === "owner" && <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">Owner</span>}
                    </p>
                    {p.bio && <p className="truncate text-xs text-muted-foreground">{p.bio}</p>}
                  </div>
                  {role && userId && p.id !== userId && (
                    <form action={startConversation.bind(null, p.id)}>
                      <IconTip label={`Message ${name}`}>
                        <button type="submit" className="grid size-8 place-items-center rounded-full text-muted-foreground transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-90">
                          <MessageSquare className="size-4" aria-hidden />
                        </button>
                      </IconTip>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>

        {role === "member" && (
          <form action={leaveGroup.bind(null, group.id, group.slug)} className="px-1">
            <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><LogOut className="size-4" aria-hidden />Leave community</button>
          </form>
        )}
      </aside>
    </div>
  )
}
