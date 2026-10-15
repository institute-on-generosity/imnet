import { CalendarPlus, Clock, MapPin } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DateTile, EventRow } from "@/components/events-panel"
import { FollowButton } from "@/components/follow-button"
import Link from "@/components/intent-link"
import { LocalTime } from "@/components/local-time"
import { OrgMark } from "@/components/org-mark"
import { FoundationMark } from "@/components/org-type-badge"
import { ShareButton } from "@/components/share-button"
import { Panel, TwoColumn } from "@/components/shell"
import { ToggleSignal } from "@/components/toggle-signal"
import { buttonVariants } from "@/components/ui/button"
import { orgCoverSrc } from "@/lib/cover"
import { googleCalendarUrl, hasStarted, mapsUrl } from "@/lib/events"
import { getCauses, getFollow, getMyRsvpIds, getEvent, getUpcomingEvents } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) return {}
  const description = `${event.org.name} · ${event.location}`
  return { title: event.title, description, openGraph: { title: event.title, description } }
}

// An event, LinkedIn-style: host's cover, date, where, RSVP, add to calendar, details, host, more events.
// RSVPs stay private (no attendee count); the host's team sees who's going on their dashboard.
export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()
  const userId = await getUserId()
  const cause = event.causes[0]
  const [rsvps, follow, fromHost, inCause, causes] = await Promise.all([
    getMyRsvpIds(userId, [event.id]),
    getFollow(userId, event.org.id),
    getUpcomingEvents({ orgId: event.org.id, limit: 4 }),
    cause ? getUpcomingEvents({ cause, limit: 5 }) : Promise.resolve([]),
    getCauses(),
  ])
  const more = fromHost.filter((e) => e.id !== event.id).slice(0, 3)
  const related = inCause.filter((e) => e.id !== event.id && e.org.id !== event.org.id).slice(0, 3)
  const moreIds = [...more, ...related].map((e) => e.id)
  const rsvpIds = await getMyRsvpIds(userId, moreIds)
  const past = hasStarted(event.starts_at)
  const cover = orgCoverSrc(event.org.cover_url)
  const causeName = causes.find((c) => c.slug === cause)?.name
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/e/${event.id}`

  return (
    <TwoColumn
      right={
        <>
          {more.length > 0 && (
            <Panel className="p-4">
              <h2 className="h-rail">More from {event.org.name}</h2>
              <ul className="mt-1 divide-y">{more.map((e) => <EventRow key={e.id} event={e} going={rsvpIds.has(e.id)} signedIn={!!userId} compact />)}</ul>
            </Panel>
          )}
          {related.length > 0 && (
            <Panel className="p-4">
              <h2 className="h-rail">More in {causeName ?? "this cause"}</h2>
              <ul className="mt-1 divide-y">{related.map((e) => <EventRow key={e.id} event={e} going={rsvpIds.has(e.id)} signedIn={!!userId} compact />)}</ul>
              <Link href={`/events?cause=${cause}`} className="mt-2 block text-sm font-semibold text-leaf hover:underline">See all events</Link>
            </Panel>
          )}
        </>
      }
    >
      <Panel className="overflow-hidden">
        {cover ? (
          <div className="aspect-[3/1] bg-muted sm:aspect-[4/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" fetchPriority="high" className="size-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[3/1] bg-gradient-to-r from-leaf-soft to-marigold-soft sm:aspect-[4/1]" />
        )}
        <div className="px-4 pb-5 sm:px-6">
          <DateTile iso={event.starts_at} className="relative -mt-8 size-16 bg-card shadow-sm [&>span:first-child]:text-xs [&>span:last-child]:text-2xl [&>span:last-child]:leading-[20px]" />
          {past && <p className="mt-3 w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">This event has ended</p>}
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            Event by
            <Link href={`/o/${event.org.slug}`} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
              <OrgMark org={event.org} size="sm" />{event.org.name}
            </Link>
            {event.org.org_type === "foundation" && <FoundationMark />}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <dt className="mt-0.5"><Clock className="size-4 text-muted-foreground" aria-label="When" /></dt>
              <dd><LocalTime iso={event.starts_at} format="date" /> · <LocalTime iso={event.starts_at} format="clock" /></dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="mt-0.5"><MapPin className="size-4 text-muted-foreground" aria-label="Where" /></dt>
              <dd>
                {event.location}
                {event.location.toLowerCase() !== "online" && (
                  <> · <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer" className="text-leaf hover:underline">Open in Maps</a></>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!past && <ToggleSignal kind="rsvp" id={event.id} on={rsvps.has(event.id)} signedIn={!!userId} label={`to ${event.title}`} />}
            {!past && (
              <>
                <a href={`/e/${event.id}/calendar.ics`} className={buttonVariants({ variant: "outline", size: "sm" })}><CalendarPlus aria-hidden />Add to calendar</a>
                <a href={googleCalendarUrl(event, event.org.name, url)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-leaf hover:underline">Google Calendar</a>
              </>
            )}
            <ShareButton path={`/e/${event.id}`} title={event.title} orgId={event.org.id} variant="pill" />
          </div>
          {!past && <p className="mt-2 text-xs text-muted-foreground">Your RSVP is private: only you and the host&apos;s team see it.</p>}
        </div>
      </Panel>

      {event.detail && (
        <Panel aria-labelledby="about-event" className="p-4 sm:p-6">
          <h2 id="about-event" className="h-section">About this event</h2>
          <p className="story mt-2 whitespace-pre-line">{event.detail}</p>
        </Panel>
      )}

      <Panel aria-labelledby="host" className="p-4 sm:p-6">
        <h2 id="host" className="h-section">Hosted by</h2>
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-1 shrink-0"><OrgMark org={event.org} /></span>
          <div className="min-w-0 flex-1">
            <Link href={`/o/${event.org.slug}`} className="font-semibold hover:underline">{event.org.name}</Link>
            {event.org.mission && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{event.org.mission}</p>}
          </div>
          {userId ? <FollowButton orgId={event.org.id} orgName={event.org.name} following={follow.following} /> : null}
        </div>
      </Panel>
    </TwoColumn>
  )
}
