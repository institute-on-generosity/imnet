"use client"

import { Bell, Building2, House, Megaphone, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PersonAvatar } from "./person-avatar"

// exact: only the href itself is "current"; otherwise any path under it.
type Item = { href: string; label: string; icon: "home" | "following" | "calls" | "notifications" | "nonprofits" | "me"; exact?: boolean; dot?: boolean; avatar?: string | null }
const ICONS = { home: House, following: Users, calls: Megaphone, notifications: Bell, nonprofits: Building2, me: UserRound }

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
                "flex h-14 min-w-11 flex-col items-center justify-center gap-0.5 border-b-2 px-1.5 text-xs whitespace-nowrap transition-colors sm:min-w-20 sm:px-2",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative">
                {/* "Me" shows your avatar, as on LinkedIn. */}
                {item.avatar ? <PersonAvatar name={item.label} avatarUrl={item.avatar} size="xs" className="size-5" /> : <Icon className="size-5" aria-hidden />}
                {/* A quiet dot, never a number (design principle #4). */}
                {item.dot && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-leaf ring-2 ring-card" />}
              </span>
              {/* Phones: icons only (labels stay for screen readers). */}
              <span className="sr-only sm:not-sr-only">{item.label}</span>
              {item.dot && <span className="sr-only">(new)</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
