"use client"

import { Building2, House, Megaphone, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// exact: only the href itself is "current"; otherwise any path under it.
type Item = { href: string; label: string; icon: "home" | "following" | "calls" | "nonprofits" | "me"; exact?: boolean }
const ICONS = { home: House, following: Users, calls: Megaphone, nonprofits: Building2, me: UserRound }

// Icon-over-label nav with an underline on the current page, as on LinkedIn.
export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname()
  return (
    <ul className="flex items-stretch">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 min-w-16 flex-col items-center justify-center gap-0.5 border-b-2 px-2 text-xs transition-colors sm:min-w-20",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className={cn(item.icon === "nonprofits" && "hidden sm:inline")}>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
