import { Suspense } from "react"
import { CauseFilter, OrgTypeFilter } from "@/components/cause-filter"
import { RailSkeleton } from "@/components/skeletons"
import { OlderPosts } from "@/components/older-posts"
import { decodeCursor } from "@/lib/cursor"
import { feedHref } from "@/lib/feed-href"
import { Feed } from "@/components/post-card"
import { ThreeColumn } from "@/components/shell"
import { UpcomingEvents } from "@/components/events-panel"
import { GivingAtWork, ThisWeekNearYou } from "@/components/engagement-cards"
import { CallsCard } from "@/components/calls-card"
import { JoinCard, ViewerCard } from "@/components/side-cards"
import { portfolioContext } from "@/lib/portfolio"
import { getCauses, getConfirmedGrantIds, getFeedPage, getFollowedOrgIds, getFollowedOrgs, getFollowedPersonIds, getGrantsForPosts, getCallPosts, getMovedPostIds, getMyRsvpIds, getUpcomingEvents, getSavedPostIds, getViewer, getViewerExtras, getGivingAtWork, getProfileCity, getThisWeekNear } from "@/lib/queries"
import { createClient } from "@/lib/supabase/server"
import { getUserId } from "@/lib/supabase/server"
import type { FeedType } from "@/lib/feed-href"
import { DonorComposer } from "@/components/donor-composer"

// Shared by Home (all orgs) and Following (followed orgs only).
type Props = { cause?: string; orgType?: FeedType; followingOnly?: boolean; basePath: string; before?: string }

export async function HomeFeed({ cause, orgType, followingOnly, basePath, before }: Props) {
  const cursor = decodeCursor(before)
  const userId = await getUserId()
  const [orgIds, personIds] = followingOnly && userId ? await Promise.all([getFollowedOrgIds(userId), getFollowedPersonIds(userId)]) : [undefined, undefined]
  // Following a foundation also brings in its grantees' grant reports (its portfolio).
  const reportGrantIds = orgIds?.length ? await getConfirmedGrantIds(await foundationsAmong(orgIds)) : []
  const [causes, page] = await Promise.all([
    getCauses(),
    orgIds && orgIds.length === 0 && !personIds?.length ? Promise.resolve({ posts: [], next: null }) : getFeedPage({ cause, orgIds, personIds, orgType, reportGrantIds, before: cursor ?? undefined }),
  ])
  const { posts, next } = page
  const ids = posts.map((p) => p.id)
  const [movedIds, savedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids)])
  const context = followingOnly ? portfolioContext(posts, new Set(orgIds)) : undefined

  const empty = followingOnly
    ? orgIds?.length || personIds?.length
      ? "The people and organizations you follow haven't posted for this filter yet"
      : "You don't follow anyone yet. Follow nonprofits, foundations and people from their profiles or posts."
    : orgType === "donor"
      ? "No posts from donors yet. Start one above."
      : "No stories for this cause yet. Try another cause."

  // Side columns load in parallel with the feed and stream in on their own.
  return (
    <ThreeColumn
      left={<div><Suspense fallback={<RailSkeleton rows={2} />}><LeftRail userId={userId} /></Suspense></div>}
      right={
        <div className="sticky top-20 space-y-3">
          <Suspense fallback={<RailSkeleton rows={4} />}><RightRail userId={userId} cause={cause} /></Suspense>
          <p className="px-4 text-xs leading-relaxed text-faint">
            Your feed: newest first, never ranked by popularity
          </p>
        </div>
      }
    >
      {userId && !followingOnly && <Suspense fallback={null}><GivingAtWorkCard userId={userId} skip={posts[0]?.id} /></Suspense>}
      {userId && !followingOnly && <Suspense fallback={null}><Composer userId={userId} /></Suspense>}
      <h1 className="sr-only">{followingOnly ? "From organizations you follow" : "What giving made possible"}</h1>
      {/* F-097: filters are a toolbar on the page, not another card between you and the posts. */}
      <div className="space-y-2 py-1">
        <OrgTypeFilter active={orgType} cause={cause} basePath={basePath} donors={!followingOnly} />
        {orgType !== "donor" && <CauseFilter causes={causes} active={cause} type={orgType} basePath={basePath} />}
      </div>
      <Feed posts={posts} empty={empty} movedIds={movedIds} savedIds={savedIds} signedIn={!!userId} grantsByPost={grantsByPost} context={context} />
      <OlderPosts
        olderHref={next ? feedHref(basePath, { cause, type: orgType, before: next }) : null}
        newestHref={feedHref(basePath, { cause, type: orgType })}
        isFirstPage={!cursor}
      />
    </ThreeColumn>
  )
}

async function Composer({ userId }: { userId: string }) {
  const [viewer, orgs] = await Promise.all([getViewer(userId), getFollowedOrgs(userId)])
  if (!viewer) return null
  return <DonorComposer viewer={{ id: viewer.id, name: viewer.display_name ?? `@${viewer.handle}`, avatarUrl: viewer.avatar_url }} orgs={orgs} />
}

async function LeftRail({ userId }: { userId: string | null }) {
  const [viewer, extras] = await Promise.all([getViewer(userId), userId ? getViewerExtras(userId) : null])
  return viewer && extras ? <ViewerCard viewer={viewer} extras={extras} /> : <JoinCard />
}

async function RightRail({ userId, cause }: { userId: string | null; cause?: string }) {
  // F-091: Home's right column is only ways to help: calls and upcoming events.
  // F-108: with a known home city, the rail leads with what you can do nearby this week.
  const city = await getProfileCity(userId)
  const [volunteer, donate, events, soon] = await Promise.all([
    getCallPosts({ kinds: ["call_volunteers"], cause, limit: 3 }),
    getCallPosts({ kinds: ["call_donations"], cause, limit: 3 }),
    city ? Promise.resolve([]) : getUpcomingEvents({ cause, limit: 3 }),
    city ? getThisWeekNear(city.at) : Promise.resolve([]),
  ])
  const rsvpIds = await getMyRsvpIds(userId, [...events.map((e) => e.id), ...soon.filter((s) => s.kind === "event").map((s) => s.id)])
  return (
    <>
      {city && <ThisWeekNearYou items={soon} city={city.label} signedIn={!!userId} rsvpIds={rsvpIds} />}
      <CallsCard volunteer={volunteer} donate={donate} cause={cause} signedIn={!!userId} />
      {!city && <UpcomingEvents events={events} rsvpIds={rsvpIds} signedIn={!!userId} cause={cause} />}
    </>
  )
}

async function foundationsAmong(orgIds: string[]) {
  const supabase = await createClient()
  const { data } = await supabase.from("orgs").select("id").in("id", orgIds).eq("org_type", "foundation")
  return (data ?? []).map((o) => o.id)
}


// F-107: the newest impact from an org you supported, if it's from the last two weeks.
// Skips the post already at the top of the feed, so the same story never shows twice in a row.
async function GivingAtWorkCard({ userId, skip }: { userId: string; skip?: string }) {
  const updates = (await getGivingAtWork(userId, 14)).filter((u) => u.id !== skip)
  return updates[0] ? <GivingAtWork update={updates[0]} more={updates.length - 1} /> : null
}
