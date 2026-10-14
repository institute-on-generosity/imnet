import { MapPin } from "lucide-react"
import Link from "next/link"
import type { EventWithOrg, OrgEvent } from "@/lib/events"
import { cn } from "@/lib/utils"
import { LocalTime } from "./local-time"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"
import { ToggleSignal } from "./toggle-signal"

// Calendar tile. Line boxes are trimmed to the glyphs (tight leading) so the month and day are
// centred by their ink, not by the serif font's tall ascender space, then pb-0.5 lifts them 1px to
// the optical centre (just above the geometric one). mt-[3px] on the tile lines
// its top edge up with the title's cap height.
function DateTile({ iso, className }: { iso: string; className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-12 shrink-0 flex-col items-center justify-center gap-px rounded-lg border bg-muted/40 pb-0.5", className)}>
      <span className="text-[10px] leading-[8px] font-semibold tracking-wide text-leaf uppercase"><LocalTime iso={iso} format="month" /></span>
      <span className="font-heading text-lg leading-[14px] font-semibold"><LocalTime iso={iso} format="day" /></span>
    </span>
  )
}

type RowProps = { event: OrgEvent | EventWithOrg; going: boolean; signedIn: boolean; compact?: boolean }

export function EventRow({ event: e, going, signedIn, compact }: RowProps) {
  const org = "org" in e ? e.org : null
  if (compact) {
    // Sidebar: fixed date tile, title, then time and host on one line, with a small RSVP below.
    return (
      <li className="flex gap-3 py-3">
        <DateTile iso={e.starts_at} className="mt-[3px]" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">{e.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground"><LocalTime iso={e.starts_at} format="time" /></p>
          {org && <Link href={`/o/${org.slug}`} className="block truncate text-xs text-muted-foreground hover:underline">{org.name}</Link>}
          <div className="mt-1.5"><ToggleSignal kind="rsvp" id={e.id} on={going} signedIn={signedIn} label={`to ${e.title}`} size="sm" /></div>
        </div>
      </li>
    )
  }
  return (
    <li className="flex gap-3 py-3.5">
      {org ? (
        <OrgMark org={org} />
      ) : (
        <DateTile iso={e.starts_at} className="mt-[3px]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{e.title}</p>
        <p className="text-sm text-muted-foreground">
          <LocalTime iso={e.starts_at} />
          {org && <>, <Link href={`/o/${org.slug}`} className="hover:underline">{org.name}</Link></>}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden />{e.location}</p>
        {e.detail && <p className="mt-1 text-sm">{e.detail}</p>}
      </div>
      <ToggleSignal kind="rsvp" id={e.id} on={going} signedIn={signedIn} label={`to ${e.title}`} />
    </li>
  )
}

// Org profile: what's coming up.
export function EventsPanel({ events, rsvpIds, signedIn }: { events: OrgEvent[]; rsvpIds: Set<string>; signedIn: boolean }) {
  if (events.length === 0) return null
  return (
    <Panel aria-labelledby="events" className="p-4 sm:p-6">
      <h2 id="events" className="font-sans text-lg font-semibold tracking-normal">Upcoming events</h2>
      <ul className="mt-3 divide-y border-y">
        {events.map((e) => <EventRow key={e.id} event={e} going={rsvpIds.has(e.id)} signedIn={signedIn} />)}
      </ul>
    </Panel>
  )
}

// Home sidebar: the next few events across the network.
export function UpcomingEvents({ events, rsvpIds, signedIn, cause }: { events: EventWithOrg[]; rsvpIds: Set<string>; signedIn: boolean; cause?: string }) {
  if (events.length === 0) return null
  return (
    <Panel aria-labelledby="upcoming" className="p-4">
      <h2 id="upcoming" className="font-sans text-base font-semibold tracking-normal">Upcoming events</h2>
      <ul className="mt-1 divide-y">
        {events.map((e) => <EventRow key={e.id} event={e} going={rsvpIds.has(e.id)} signedIn={signedIn} compact />)}
      </ul>
      <Link href={cause ? `/events?cause=${cause}` : "/events"} className="mt-2 block text-sm font-semibold text-leaf hover:underline">See all events</Link>
    </Panel>
  )
}
