import { LogOut, Search } from "lucide-react"
import Link from "@/components/intent-link"
import { signOut } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"
import { hasUnread } from "@/lib/notifications"
import { createClient, getUserId } from "@/lib/supabase/server"
import { IconTip } from "./icon-tip"
import { HeaderSearch } from "./header-search"
import { NavLinks } from "./nav-links"
import { CONTAINER } from "./shell"

export async function SiteHeader() {
  const userId = await getUserId()
  let handle: string | null = null
  let avatar: string | null = null
  let unread: Promise<boolean> | false = false
  if (userId) {
    const supabase = await createClient()
    const { data } = await supabase.from("profiles").select("handle, avatar_url").eq("id", userId).single()
    handle = data?.handle ?? null
    avatar = data?.avatar_url ?? null
    // Not awaited: the dot streams in, so the header (and page) never wait on notifications.
    unread = hasUnread(userId)
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className={`${CONTAINER} flex items-center gap-2 sm:gap-3`}>
        <Link href="/" className="font-heading text-xl font-semibold tracking-tight sm:text-2xl" aria-label="imnet home">imnet</Link>

        <HeaderSearch />

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
                  ...(handle ? [{ href: `/u/${handle}`, label: "Me", icon: "me" as const, exact: true, avatar }] : []),
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
