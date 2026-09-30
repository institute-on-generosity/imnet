import Link from "next/link"
import { signOut } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { createClient, getUserId } from "@/lib/supabase/server"

export async function SiteHeader() {
  const userId = await getUserId()
  let handle: string | null = null
  if (userId) {
    const supabase = await createClient()
    const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single()
    handle = data?.handle ?? null
  }

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-semibold">imnet</Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground">Explore</Link>
        {userId && <Link href="/following" className="text-muted-foreground hover:text-foreground">Following</Link>}
        <div className="ml-auto flex items-center gap-3">
          {userId ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">For nonprofits</Link>
              {handle && <Link href={`/u/${handle}`} className="text-muted-foreground hover:text-foreground">@{handle}</Link>}
              <form action={signOut}><Button variant="ghost" size="sm" type="submit">Sign out</Button></form>
            </>
          ) : (
            <Link href="/login"><Button size="sm">Sign in</Button></Link>
          )}
        </div>
      </nav>
    </header>
  )
}
