import { CalendarDays, ExternalLink, HandHelping, MapPin, Sparkles } from "lucide-react"
import Link from "@/components/intent-link"
import { formatMiles } from "@/lib/geo"
import type { ImpactUpdate, NearbySoon } from "@/lib/queries"
import { LocalTime } from "./local-time"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"
import { ToggleSignal } from "./toggle-signal"

// F-107: the newest thing your giving became, at the top of Home. Closes the loop on a gift.
export function GivingAtWork({ update, more }: { update: ImpactUpdate; more: number }) {
  return (
    <Panel aria-labelledby="giving-at-work" className="overflow-hidden border-leaf/25">
      <div className="flex items-center gap-2 bg-leaf-soft/70 px-4 py-2.5">
        <Sparkles className="size-4 text-leaf" aria-hidden />
        <h2 id="giving-at-work" className="text-sm font-semibold text-leaf">Your giving at work</h2>
        {more > 0 && <Link href="/giving#since" className="ml-auto text-xs font-semibold text-leaf hover:underline">{more} more</Link>}
      </div>
      <Link href={`/p/${update.id}`} className="group flex gap-3 p-4 hover:bg-muted/40">
        <OrgMark org={update.org} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{update.org.name}</span>, which you {update.how === "gave" ? "gave to" : "volunteered with"}, {update.report ? "reported on a grant" : "shared what support made possible"}
          </p>
          <p className="story mt-1 line-clamp-3 text-[1.0625rem] leading-relaxed group-hover:underline">{update.body}</p>
        </div>
      </Link>
    </Panel>
  )
}

// F-108: two or three things to do near you this week, one tap each.
export function ThisWeekNearYou({ items, city, signedIn, rsvpIds }: { items: NearbySoon[]; city: string; signedIn: boolean; rsvpIds: Set<string> }) {
  return (
    <Panel aria-labelledby="this-week" className="p-4">
      <h2 id="this-week" className="h-rail">This week near you</h2>
      <p className="flex items-center gap-1 text-xs text-faint"><MapPin className="size-3" aria-hidden />Around {city}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing in the next week nearby. <Link href="/nearby" className="font-semibold text-leaf hover:underline">See everything near you</Link></p>
      ) : (
        <ul className="mt-1 divide-y">
          {items.map((i) => {
            const Icon = i.kind === "event" ? CalendarDays : HandHelping
            return (
              <li key={`${i.kind}-${i.id}`} className="group relative flex items-center gap-2.5 py-2.5">
                <span className="relative shrink-0">
                  <OrgMark org={i.org} size="sm" />
                  <span className="absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full text-white ring-2 ring-card" style={{ backgroundColor: i.kind === "event" ? "#14213d" : "#1f7a5a" }} aria-hidden><Icon className="size-2" /></span>
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={i.href} className="line-clamp-1 text-[13px] leading-5 font-semibold group-hover:underline after:absolute after:inset-0">{i.title}</Link>
                  <p className="truncate text-xs leading-4 text-muted-foreground">
                    {i.when ? <LocalTime iso={i.when} format={i.kind === "event" ? "full" : "day_short"} /> : "Any time"} · {i.miles < 1 && i.org.location ? i.org.location.replace(/, [A-Z]{2}$/, "") : formatMiles(i.miles)}
                  </p>
                </div>
                <div className="relative shrink-0">
                  {i.kind === "event" ? (
                    <ToggleSignal kind="rsvp" id={i.id} on={rsvpIds.has(i.id)} signedIn={signedIn} label={`to ${i.title}`} size="sm" />
                  ) : i.actionUrl ? (
                    <a href={i.actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-leaf py-0.5 pr-2 pl-2.5 text-xs font-semibold text-white transition-transform hover:bg-leaf/90 active:scale-95">
                      Sign up<ExternalLink className="size-3" aria-hidden /><span className="sr-only"> for {i.title} (opens {i.org.name}&apos;s site)</span>
                    </a>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link href="/nearby" className="mt-1 block border-t pt-2.5 text-sm font-semibold text-leaf hover:underline">See everything near you</Link>
    </Panel>
  )
}
