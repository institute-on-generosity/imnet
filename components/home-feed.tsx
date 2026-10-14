import { CauseFilter, OrgTypeFilter } from "@/components/cause-filter"
import { OlderPosts } from "@/components/older-posts"
import { decodeCursor } from "@/lib/cursor"
import { feedHref } from "@/lib/feed-href"
import { Feed } from "@/components/post-card"
import { Panel, ThreeColumn } from "@/components/shell"
import { WaysToHelp } from "@/components/needs-panel"
import { JoinCard, SuggestedOrgs, ViewerCard } from "@/components/side-cards"
import { portfolioContext } from "@/lib/portfolio"
import { getCauses, getConfirmedGrantIds, getFeedPage, getFollowedOrgIds, getGrantsForPosts, getMovedPostIds, getOpenNeeds, getSavedPostIds, getSuggestedOrgs, getViewer } from "@/lib/queries"
import { createClient } from "@/lib/supabase/server"
import { getUserId } from "@/lib/supabase/server"
import type { OrgType } from "@/lib/types"

// Shared by Home (all orgs) and Following (followed orgs only).
type Props = { cause?: string; orgType?: OrgType; followingOnly?: boolean; basePath: string; before?: string }

export async function HomeFeed({ cause, orgType, followingOnly, basePath, before }: Props) {
  const cursor = decodeCursor(before)
  const userId = await getUserId()
  const orgIds = followingOnly && userId ? await getFollowedOrgIds(userId) : undefined
  // Following a foundation also brings in its grantees' grant reports (its portfolio).
  const reportGrantIds = orgIds?.length ? await getConfirmedGrantIds(await foundationsAmong(orgIds)) : []
  const [viewer, causes, page, suggested, needs] = await Promise.all([
    getViewer(userId),
    getCauses(),
    orgIds && orgIds.length === 0 ? Promise.resolve({ posts: [], next: null }) : getFeedPage({ cause, orgIds, orgType, reportGrantIds, before: cursor ?? undefined }),
    getSuggestedOrgs({ userId, cause }),
    getOpenNeeds({ cause, limit: 3 }),
  ])
  const { posts, next } = page
  const ids = posts.map((p) => p.id)
  const [movedIds, savedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids)])
  const context = followingOnly ? portfolioContext(posts, new Set(orgIds)) : undefined

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
          <WaysToHelp needs={needs} cause={cause} />
          <p className="px-4 text-xs leading-relaxed text-muted-foreground">
            Newest first. Never ranked by popularity.
          </p>
        </div>
      }
    >
      <h1 className="sr-only">{followingOnly ? "From organizations you follow" : "What giving made possible"}</h1>
      <Panel>
        <div className="p-2.5">
          <OrgTypeFilter active={orgType} cause={cause} basePath={basePath} />
        </div>
        <div className="border-t p-2.5">
          <CauseFilter causes={causes} active={cause} type={orgType} basePath={basePath} />
        </div>
      </Panel>
      <Feed posts={posts} empty={empty} movedIds={movedIds} savedIds={savedIds} signedIn={!!userId} grantsByPost={grantsByPost} context={context} />
      <OlderPosts
        olderHref={next ? feedHref(basePath, { cause, type: orgType, before: next }) : null}
        newestHref={feedHref(basePath, { cause, type: orgType })}
        isFirstPage={!cursor}
      />
    </ThreeColumn>
  )
}

async function foundationsAmong(orgIds: string[]) {
  const supabase = await createClient()
  const { data } = await supabase.from("orgs").select("id").in("id", orgIds).eq("org_type", "foundation")
  return (data ?? []).map((o) => o.id)
}

