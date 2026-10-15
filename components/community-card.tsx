import { MapPin } from "lucide-react"
import Link from "@/components/intent-link"
import { cn } from "@/lib/utils"
import { CommunityMark } from "./community-mark"

type Props = {
  slug: string; name: string; cause_slug: string | null; icon_path: string | null; members: number
  causeName?: string; description?: string | null; place?: { location: string; distance: string } | null
  joined?: boolean; unread?: boolean; compact?: boolean
}

// F-104: one card for every community list (near you, yours, discover), so the page reads as one
// system: picture, name, then the one fact that matters for that list, then quiet details.
export function CommunityCard({ slug, name, cause_slug, icon_path, members, causeName, description, place, joined, unread, compact }: Props) {
  const meta = [causeName, `${members.toLocaleString("en-US")} ${members === 1 ? "member" : "members"}`].filter(Boolean).join(" · ")
  return (
    <Link href={`/communities/${slug}`} className={cn("group flex h-full items-start gap-3 bg-card hover:bg-muted/50", compact ? "p-3" : "p-4")}>
      <CommunityMark cause={cause_slug} icon={icon_path} size={compact ? "sm" : "md"} className={compact ? "size-10" : undefined} />
      <div className="min-w-0 flex-1">
        <p className={cn("leading-snug font-semibold group-hover:underline", compact && "truncate")}>{name}</p>
        {place && (
          <p className="mt-0.5 flex items-center gap-1 text-sm">
            <span className="shrink-0 font-semibold text-leaf">{place.distance}</span>
            <span className="text-faint" aria-hidden>·</span>
            <MapPin className="size-3.5 shrink-0 text-faint" aria-hidden /><span className="truncate text-muted-foreground">{place.location}</span>
          </p>
        )}
        {unread && <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-leaf"><span className="size-2 rounded-full bg-leaf" aria-hidden />New messages</p>}
        {description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <p className="mt-1 text-xs text-faint">
          {meta}
          {joined && <span className="ml-1.5 rounded-full bg-leaf-soft px-1.5 py-px font-medium text-leaf">Joined</span>}
        </p>
      </div>
    </Link>
  )
}

// A 2-column grid with hairline dividers, inside a Panel.
export function CommunityGrid({ children }: { children: React.ReactNode }) {
  // An odd last card spans both columns, so there's never an empty grey cell.
  return <ul className="grid gap-px bg-border sm:grid-cols-2 [&>li]:bg-card sm:[&>li:last-child:nth-child(odd)]:col-span-2">{children}</ul>
}
