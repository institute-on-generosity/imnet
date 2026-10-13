import { CauseFilter } from "@/components/cause-filter"
import { Feed } from "@/components/post-card"
import { Panel, ThreeColumn } from "@/components/shell"
import { JoinCard, SuggestedOrgs, ViewerCard } from "@/components/side-cards"
import { getCauses, getFeed, getFollowedOrgIds, getMovedPostIds, getSuggestedOrgs, getViewer } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

// Shared by Home (all orgs) and Following (followed orgs only).
export async function HomeFeed({ cause, followingOnly, basePath }: { cause?: string; followingOnly?: boolean; basePath: string }) {
  const userId = await getUserId()
  const orgIds = followingOnly && userId ? await getFollowedOrgIds(userId) : undefined
  const [viewer, causes, posts, suggested] = await Promise.all([
    getViewer(userId),
    getCauses(),
    orgIds && orgIds.length === 0 ? Promise.resolve([]) : getFeed({ cause, orgIds }),
    getSuggestedOrgs({ userId, cause }),
  ])
  const movedIds = await getMovedPostIds(userId, posts.map((p) => p.id))

  const empty = followingOnly
    ? orgIds?.length
      ? "The nonprofits you follow haven't posted for this cause yet."
      : "You don't follow any nonprofits yet. Pick some from Nonprofits to follow."
    : "No stories for this cause yet. Try another cause."

  return (
    <ThreeColumn
      left={<div className="sticky top-20">{viewer ? <ViewerCard viewer={viewer} /> : <JoinCard />}</div>}
      right={
        <div className="sticky top-20 space-y-3">
          <SuggestedOrgs title={cause ? "Nonprofits in this cause" : "Nonprofits to follow"} orgs={suggested} signedIn={!!userId} />
          <p className="px-4 text-xs leading-relaxed text-muted-foreground">
            Your feed is newest first. imnet never ranks stories by popularity.
          </p>
        </div>
      }
    >
      <Panel className="space-y-3 p-4">
        <h1 className="font-sans text-lg font-semibold tracking-normal">
          {followingOnly ? "From nonprofits you follow" : "What giving made possible"}
        </h1>
        <CauseFilter causes={causes} active={cause} basePath={basePath} />
      </Panel>
      <Feed posts={posts} empty={empty} movedIds={movedIds} signedIn={!!userId} />
    </ThreeColumn>
  )
}
