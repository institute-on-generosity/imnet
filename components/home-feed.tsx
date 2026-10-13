import { CauseFilter, OrgTypeFilter } from "@/components/cause-filter"
import { Feed } from "@/components/post-card"
import { Panel, ThreeColumn } from "@/components/shell"
import { JoinCard, SuggestedOrgs, ViewerCard } from "@/components/side-cards"
import { getCauses, getFeed, getFollowedOrgIds, getGrantsForPosts, getMovedPostIds, getSuggestedOrgs, getViewer } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import type { OrgType } from "@/lib/types"

// Shared by Home (all orgs) and Following (followed orgs only).
export async function HomeFeed({ cause, orgType, followingOnly, basePath }: { cause?: string; orgType?: OrgType; followingOnly?: boolean; basePath: string }) {
  const userId = await getUserId()
  const orgIds = followingOnly && userId ? await getFollowedOrgIds(userId) : undefined
  const [viewer, causes, posts, suggested] = await Promise.all([
    getViewer(userId),
    getCauses(),
    orgIds && orgIds.length === 0 ? Promise.resolve([]) : getFeed({ cause, orgIds, orgType }),
    getSuggestedOrgs({ userId, cause }),
  ])
  const ids = posts.map((p) => p.id)
  const [movedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getGrantsForPosts(ids)])

  const empty = followingOnly
    ? orgIds?.length
      ? "The nonprofits you follow haven't posted for this cause yet."
      : "You don't follow anyone yet. Pick nonprofits and foundations from Add to your feed."
    : "No stories for this cause yet. Try another cause."

  return (
    <ThreeColumn
      left={<div className="sticky top-20">{viewer ? <ViewerCard viewer={viewer} /> : <JoinCard />}</div>}
      right={
        <div className="sticky top-20 space-y-3">
          <SuggestedOrgs title={cause ? "Organizations in this cause" : "Add to your feed"} orgs={suggested} signedIn={!!userId} />
          <p className="px-4 text-xs leading-relaxed text-muted-foreground">
            Your feed is newest first. imnet never ranks stories by popularity.
          </p>
        </div>
      }
    >
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-sans text-lg font-semibold tracking-normal">
            {followingOnly ? "From organizations you follow" : "What giving made possible"}
          </h1>
          <OrgTypeFilter active={orgType} cause={cause} basePath={basePath} />
        </div>
        <CauseFilter causes={causes} active={cause} type={orgType} basePath={basePath} />
      </Panel>
      <Feed posts={posts} empty={empty} movedIds={movedIds} signedIn={!!userId} grantsByPost={grantsByPost} />
    </ThreeColumn>
  )
}
