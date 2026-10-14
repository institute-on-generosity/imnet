import { LogOut, Search } from "lucide-react"
import Link from "next/link"
import { signOut } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"
import { hasUnread } from "@/lib/notifications"
import { createClient, getUserId } from "@/lib/supabase/server"
import { IconTip } from "./icon-tip"
import { NavLinks } from "./nav-links"
import { CONTAINER } from "./shell"

export async function SiteHeader() {
  const userId = await getUserId()
  let handle: string | null = null
  let unread = false
  if (userId) {
    const supabase = await createClient()
    const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single()
    handle = data?.handle ?? null
    unread = await hasUnread(userId)
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className={`${CONTAINER} flex items-center gap-3`}>
        <Link href="/" className="font-heading text-2xl font-semibold tracking-tight" aria-label="imnet home">imnet</Link>

        <form action="/search" role="search" className="relative hidden flex-1 sm:block sm:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            placeholder="Search orgs, people, posts"
            aria-label="Search"
            className="h-9 w-full rounded-md bg-muted pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </form>

        <nav aria-label="Main" className="ml-auto flex items-center">
          {userId ? (
            <>
              <NavLinks
                items={[
                  { href: "/", label: "Home", icon: "home", exact: true },
                  { href: "/following", label: "Following", icon: "following" },
                  { href: "/calls", label: "Open calls", icon: "calls" },
                  { href: "/notifications", label: "Notifications", icon: "notifications", dot: unread },
                  { href: "/dashboard", label: "For nonprofits", icon: "nonprofits" },
                  ...(handle ? [{ href: `/u/${handle}`, label: "Me", icon: "me" as const, exact: true }] : []),
                ]}
              />
              <form action={signOut} className="ml-1 hidden sm:block">
                <IconTip label="Sign out">
                  <button type="submit" className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                    <LogOut className="size-4" aria-hidden />
                  </button>
                </IconTip>
              </form>
            </>
          ) : (
            <div className="flex items-center gap-2 py-2.5">
              <Link href="/search" className="text-muted-foreground sm:hidden" aria-label="Search"><Search className="size-5" /></Link>
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Join now</Link>
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>Sign in</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
