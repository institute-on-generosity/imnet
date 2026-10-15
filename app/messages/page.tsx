import { MessageSquare } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "@/components/intent-link"
import { buttonVariants } from "@/components/ui/button"
import { getConversations } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { MessagesShell } from "./layout-parts"

export const metadata = { title: "Messaging" }

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/messages")
  const { error } = await searchParams
  const conversations = await getConversations(userId)
  return (
    <MessagesShell conversations={conversations}>
      <div className="grid h-full min-h-[50dvh] place-items-center p-8 text-center">
        <div>
          <MessageSquare className="mx-auto size-8 text-faint" aria-hidden />
          {error === "not-allowed" ? (
            <p role="alert" className="mt-3 text-sm text-destructive">You can message people you share a community with, or who follow you</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Pick a conversation, or find people in your communities</p>
          )}
          <Link href="/communities" className={buttonVariants({ variant: "outline", className: "mt-4" })}>Go to communities</Link>
        </div>
      </div>
    </MessagesShell>
  )
}
