import { CauseFilter } from "@/components/cause-filter"
import { Feed } from "@/components/post-card"
import { Panel, TwoColumn } from "@/components/shell"
import { getCauses, getGrantsForPosts, getMovedPostIds, getSavedPostIds, getOpenCalls } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Open calls" }

// Foundations' calls for applications, soonest deadline first. Closed calls drop off.
export default async function CallsPage({ searchParams }: PageProps<"/calls">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const userId = await getUserId()
  const [calls, causes] = await Promise.all([getOpenCalls({ causes: active ? [active] : undefined }), getCauses()])
  const ids = calls.map((c) => c.id)
  const [movedIds, savedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids)])

  return (
    <TwoColumn>
      <Panel className="space-y-3 p-4">
        <div>
          <h1 className="h-page">Open calls</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Foundations&apos; calls for grants, soonest deadline first. <span className="text-faint">You apply on their site.</span></p>
        </div>
        <CauseFilter causes={causes} active={active} basePath="/calls" />
      </Panel>
      <Feed
        posts={calls}
        empty={active ? "No open calls for this cause right now. Try all causes." : "No open calls right now."}
        movedIds={movedIds} savedIds={savedIds}
        signedIn={!!userId}
        grantsByPost={grantsByPost}
      />
    </TwoColumn>
  )
}
