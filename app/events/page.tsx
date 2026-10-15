import { CallsCard } from "@/components/calls-card"
import { CauseFilter } from "@/components/cause-filter"
import { EventRow } from "@/components/events-panel"
import { Panel, TwoColumn } from "@/components/shell"
import { getCallPosts, getCauses, getMyRsvpIds, getUpcomingEvents } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Events" }

// Volunteer days, open houses and gatherings, soonest first. RSVPs are private.
export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const userId = await getUserId()
  const [events, causes, volunteer, donate] = await Promise.all([
    getUpcomingEvents({ cause: active }), getCauses(),
    getCallPosts({ kinds: ["call_volunteers"], cause: active, limit: 3 }), getCallPosts({ kinds: ["call_donations"], cause: active, limit: 3 }),
  ])
  const rsvpIds = await getMyRsvpIds(userId, events.map((e) => e.id))

  return (
    <TwoColumn right={<CallsCard volunteer={volunteer} donate={donate} cause={active} signedIn={!!userId} />}>
      <Panel className="space-y-3 p-4">
        <div>
          <h1 className="h-page">Events</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Volunteer days and gatherings, soonest first. <span className="text-faint">Your RSVP is private: only you and the host&apos;s team see it.</span></p>
        </div>
        <CauseFilter causes={causes} active={active} basePath="/events" />
      </Panel>
      <Panel className="px-4">
        {events.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{active ? "No upcoming events for this cause. Try all causes." : "No upcoming events."}</p>
        ) : (
          <ul className="divide-y">{events.map((e) => <EventRow key={e.id} event={e} going={rsvpIds.has(e.id)} signedIn={!!userId} />)}</ul>
        )}
      </Panel>
    </TwoColumn>
  )
}
