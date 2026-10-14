import { MapPin } from "lucide-react"
import Link from "next/link"
import type { EventWithOrg, OrgEvent } from "@/lib/events"
import { LocalTime } from "./local-time"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"
import { ToggleSignal } from "./toggle-signal"

type RowProps = { event: OrgEvent | EventWithOrg; going: boolean; signedIn: boolean; compact?: boolean }

export function EventRow({ event: e, going, signedIn, compact }: RowProps) {
  const org = "org" in e ? e.org : null
  if (compact) {
    // Sidebar: fixed date tile, title, then time and host on one line, with a small RSVP below.
    return (
      <li className="flex gap-3 py-3">
        <span aria-hidden className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40 leading-none">
          <span className="text-[10px] font-semibold text-leaf uppercase"><LocalTime iso={e.starts_at} format="month" /></span>
          <span className="mt-0.5 font-heading text-lg font-semibold"><LocalTime iso={e.starts_at} format="day" /></span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">{e.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <LocalTime iso={e.starts_at} format="time" />
            {org && <> · <Link href={`/o/${org.slug}`} className="hover:underline">{org.name}</Link></>}
          </p>
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
        <span aria-hidden className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40 leading-none">
          <span className="text-[10px] font-semibold text-leaf uppercase"><LocalTime iso={e.starts_at} format="month" /></span>
          <span className="mt-0.5 font-heading text-lg font-semibold"><LocalTime iso={e.starts_at} format="day" /></span>
        </span>
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
