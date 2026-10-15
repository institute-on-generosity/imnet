import { UserPlus } from "lucide-react"
import Link from "@/components/intent-link"
import { notFound } from "next/navigation"
import { acceptInvite } from "@/app/actions"
import { Panel } from "@/components/shell"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient, getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Join your team" }

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const [{ token }, { error }] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound()
  const supabase = await createClient()
  const { data } = await supabase.rpc("invite_preview", { invite_token: token })
  const invite = data?.[0]
  if (!invite) notFound()
  const userId = await getUserId()

  return (
    <div className="mx-auto max-w-md px-4">
      <Panel className="space-y-4 p-6">
        <h1 className="h-page">Join {invite.org_name}</h1>
        {invite.accepted ? (
          <p className="text-muted-foreground">This invite has already been used</p>
        ) : userId ? (
          <>
            <p className="text-muted-foreground">You&apos;ll be able to post, edit the profile and manage grants for {invite.org_name}.</p>
            <form action={acceptInvite.bind(null, token)}>
              <Button type="submit"><UserPlus aria-hidden />Join {invite.org_name}</Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Sign in with the email address the invite was sent to</p>
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={buttonVariants()}>Sign in to join</Link>
          </>
        )}
        {typeof error === "string" && <p className="text-sm text-destructive">{error.charAt(0).toUpperCase() + error.slice(1)}.</p>}
      </Panel>
    </div>
  )
}
