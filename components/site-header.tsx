import Link from "next/link"
import { signOut } from "@/app/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient, getUserId } from "@/lib/supabase/server"

export async function SiteHeader() {
  const userId = await getUserId()
  let handle: string | null = null
  if (userId) {
    const supabase = await createClient()
    const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single()
    handle = data?.handle ?? null
  }
  const nav = "rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"

  return (
    <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
      <nav className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-2.5 text-sm sm:px-6">
        <Link href="/" className="mr-3 font-heading text-2xl font-semibold tracking-tight">imnet</Link>
        <Link href="/" className={nav}>Explore</Link>
        {userId && <Link href="/following" className={nav}>Following</Link>}
        <div className="ml-auto flex items-center gap-1">
          {userId ? (
            <>
              <Link href="/dashboard" className={`${nav} hidden sm:inline`}>For nonprofits</Link>
              {handle && <Link href={`/u/${handle}`} className={nav}>Profile</Link>}
              <form action={signOut}><Button variant="ghost" size="sm" type="submit">Sign out</Button></form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  )
}
