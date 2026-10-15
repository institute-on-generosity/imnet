import { redirect } from "next/navigation"
import { Feed } from "@/components/post-card"
import { Panel, TwoColumn } from "@/components/shell"
import { getGrantsForPosts, getMovedPostIds, getSavedPosts } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Saved" }

// Private: only you see what you saved.
export default async function SavedPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")
  const posts = await getSavedPosts(userId)
  const ids = posts.map((p) => p.id)
  const [movedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getGrantsForPosts(ids)])

  return (
    <TwoColumn>
      <Panel className="p-4">
        <h1 className="h-page">Saved</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Only you can see this list</p>
      </Panel>
      <Feed
        posts={posts}
        empty="Nothing saved yet. Use the bookmark on any post."
        movedIds={movedIds}
        savedIds={new Set(ids)}
        signedIn
        grantsByPost={grantsByPost}
      />
    </TwoColumn>
  )
}
