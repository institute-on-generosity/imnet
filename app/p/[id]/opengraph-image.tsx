import { OG_SIZE, ogCard } from "@/lib/og"
import { getPost, postImageUrl } from "@/lib/queries"
import { POST_KIND_LABEL } from "@/lib/types"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "Post on imnet"

// Public data only: getPost runs under RLS, so unpublished posts have no preview.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) return ogCard({ orgName: "imnet", orgType: "nonprofit", text: "Stories from nonprofits, with the sources behind them." })
  return ogCard({
    orgName: post.org?.name ?? post.author?.display_name ?? "imnet",
    orgType: post.org?.org_type ?? "nonprofit",
    eyebrow: post.org ? POST_KIND_LABEL[post.kind] : "Post",
    text: post.body,
    imageUrl: post.image_paths[0] ? postImageUrl(post.image_paths[0]) : null,
  })
}
