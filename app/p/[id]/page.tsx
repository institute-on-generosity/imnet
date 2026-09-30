import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MovedButton } from "@/components/moved-button"
import { PostCard } from "@/components/post-card"
import { TrackView } from "@/components/track-view"
import { getPost } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"

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
  let moved = false
  if (userId) {
    const supabase = await createClient()
    const { data } = await supabase.from("moved").select("post_id").match({ user_id: userId, post_id: id }).maybeSingle()
    moved = !!data
  }

  return (
    <div className="space-y-4">
      <TrackView orgId={post.org_id} postId={post.id} />
      <PostCard post={post} />
      {userId && <MovedButton postId={post.id} moved={moved} />}
    </div>
  )
}
