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
    <TwoColumn
      right={
        <Panel className="p-4 text-sm text-muted-foreground">
          Open calls are invitations from foundations to apply for grants. imnet links to each foundation&apos;s own application; we don&apos;t handle applications.
        </Panel>
      }
    >
      <Panel className="space-y-3 p-4">
        <div>
          <h1 className="font-sans text-lg font-semibold tracking-normal">Open calls</h1>
          <p className="text-sm text-muted-foreground">Grants nonprofits can apply for now, soonest deadline first.</p>
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
