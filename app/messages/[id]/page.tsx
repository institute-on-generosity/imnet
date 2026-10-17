import { ArrowLeft } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { ChatThread } from "@/components/chat-thread"
import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { ReportDialog } from "@/components/report-dialog"
import { getConversations, getMessages } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { MessagesShell } from "../layout-parts"

export const metadata = { title: "Messaging" }

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const userId = await getUserId()
  const { id } = await params
  if (!userId) redirect(`/login?next=/messages/${id}`)
  const conversations = await getConversations(userId)
  const convo = conversations.find((c) => c.id === id)
  if (!convo) notFound() // not yours (RLS) or doesn't exist
  const messages = await getMessages({ conversation: id })
  const name = convo.other.display_name ?? `@${convo.other.handle}`
  return (
    <MessagesShell conversations={conversations} activeId={id}>
      <div className="flex h-[min(calc(100dvh-140px),760px)] flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Link href="/messages" aria-label="All conversations" className="-ml-1 grid size-8 place-items-center rounded-full hover:bg-muted md:hidden"><ArrowLeft className="size-4" aria-hidden /></Link>
          <PersonAvatar name={name} avatarUrl={convo.other.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <Link href={`/u/${convo.other.handle}`} className="block truncate font-semibold hover:underline">{name}</Link>
            <p className="text-xs text-faint">Only the two of you see this conversation</p>
          </div>
          <ReportDialog profileId={convo.other.id} name={name} conversationId={id} />
        </header>
        <ChatThread key={id} target={{ conversation: id }} initial={messages} viewerId={userId} placeholder={`Message ${name}`} className="min-h-0 flex-1" />
      </div>
    </MessagesShell>
  )
}
