import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { PostCard } from "@/components/post-card"
import { Panel, TwoColumn } from "@/components/shell"
import { TrackView } from "@/components/track-view"
import { buttonVariants } from "@/components/ui/button"
import { loadComments } from "@/app/actions"
import { getFollowedOrgIds, getFollowerCounts, getGrantsForPosts, getMovedPostIds, getPost, getSavedPostIds } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  if (!post) return {}
  const description = post.body.slice(0, 200)
  return {
    title: post.org.name,
    description,
    openGraph: { title: `${post.org.name} on imnet`, description, type: "article" },
  }
}

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  const userId = await getUserId()
  const [movedIds, savedIds, grantsByPost, comments, counts, followed] = await Promise.all([
    getMovedPostIds(userId, [post.id]), getSavedPostIds(userId, [post.id]), getGrantsForPosts([post.id]), loadComments(post.id),
    getFollowerCounts([post.org_id]), userId ? getFollowedOrgIds(userId) : Promise.resolve([]),
  ])
  const moved = movedIds.has(post.id)

  return (
    <TwoColumn
      right={
        <Panel className="p-4">
          <div className="flex items-center gap-3">
            <OrgMark org={post.org} />
            <Link href={`/o/${post.org.slug}`} className="font-semibold hover:underline">{post.org.name}</Link>
          </div>
          <Link href={`/o/${post.org.slug}`} className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}>
            See their profile
          </Link>
        </Panel>
      }
    >
      <TrackView orgId={post.org_id} postId={post.id} />
      <PostCard post={post} full moved={moved} saved={savedIds.has(post.id)} signedIn={!!userId} grants={grantsByPost.get(post.id)}
        followers={counts.get(post.org_id) ?? 0} following={userId ? followed.includes(post.org_id) : undefined} comments={comments ?? undefined} />
    </TwoColumn>
  )
}
