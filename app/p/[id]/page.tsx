import type { Metadata } from "next"
import Link from "@/components/intent-link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { PersonAvatar } from "@/components/person-avatar"
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
  const by = post.org?.name ?? post.author?.display_name ?? "A post"
  return { title: by, description, openGraph: { title: `${by} on imnet`, description, type: "article" } }
}

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  const userId = await getUserId()
  const [movedIds, savedIds, grantsByPost, comments, counts, followed] = await Promise.all([
    getMovedPostIds(userId, [post.id]), getSavedPostIds(userId, [post.id]), getGrantsForPosts([post.id]), loadComments(post.id),
    getFollowerCounts(post.org_id ? [post.org_id] : []), userId ? getFollowedOrgIds(userId) : Promise.resolve([]),
  ])
  const moved = movedIds.has(post.id)

  return (
    <TwoColumn
      right={
        post.org ? (
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <OrgMark org={post.org} />
              <Link href={`/o/${post.org.slug}`} className="font-semibold hover:underline">{post.org.name}</Link>
            </div>
            <Link href={`/o/${post.org.slug}`} className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}>
              See their profile
            </Link>
          </Panel>
        ) : post.author ? (
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <PersonAvatar name={post.author.display_name ?? post.author.handle} avatarUrl={post.author.avatar_url} size="lg" />
              <div className="min-w-0">
                <Link href={`/u/${post.author.handle}`} className="font-semibold hover:underline">{post.author.display_name ?? `@${post.author.handle}`}</Link>
                {post.author.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{post.author.bio}</p>}
              </div>
            </div>
            <Link href={`/u/${post.author.handle}`} className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}>
              See their profile
            </Link>
          </Panel>
        ) : null
      }
    >
      {post.org_id && <TrackView orgId={post.org_id} postId={post.id} />}
      <PostCard post={post} full moved={moved} saved={savedIds.has(post.id)} signedIn={!!userId} grants={grantsByPost.get(post.id)}
        followers={post.org_id ? (counts.get(post.org_id) ?? 0) : undefined}
        following={userId && post.org_id ? followed.includes(post.org_id) : undefined}
        canDelete={!!userId && !post.org_id && post.author_id === userId}
        comments={comments ?? undefined} />
    </TwoColumn>
  )
}
