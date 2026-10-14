"use client"

import { Bell, Building2, House, Megaphone, UserRound, Users } from "lucide-react"
import Link from "@/components/intent-link"
import { usePathname } from "next/navigation"
import { Suspense, use } from "react"
import { cn } from "@/lib/utils"
import { PersonAvatar } from "./person-avatar"

// exact: only the href itself is "current"; otherwise any path under it.
type Item = { href: string; label: string; icon: "home" | "following" | "calls" | "notifications" | "nonprofits" | "me"; exact?: boolean; dot?: boolean | Promise<boolean>; avatar?: string | null }
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
              // Main destinations are one click from every page: prefetch them in full.
              prefetch
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
                {item.dot && <Suspense fallback={null}><Dot on={item.dot} /></Suspense>}
              </span>
              {/* Phones: icons only (labels stay for screen readers). */}
              <span className="sr-only sm:not-sr-only">{item.label}</span>

            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// Quiet dot for new notifications, resolved after the header has already rendered.
function Dot({ on }: { on: boolean | Promise<boolean> }) {
  const show = typeof on === "boolean" ? on : use(on)
  if (!show) return null
  return (
    <>
      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-leaf ring-2 ring-card" />
      <span className="sr-only">(new)</span>
    </>
  )
}
