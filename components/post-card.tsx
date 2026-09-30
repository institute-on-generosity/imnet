import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { postImageUrl } from "@/lib/queries"
import { POST_KIND_LABEL, type Post } from "@/lib/types"
import { ShareButton } from "./share-button"

export function PostCard({ post }: { post: Post }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 text-sm">
        <Link href={`/o/${post.org.slug}`} className="font-medium hover:underline">{post.org.name}</Link>
        <Badge variant="secondary">{POST_KIND_LABEL[post.kind]}</Badge>
        <time className="ml-auto text-muted-foreground" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </time>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href={`/p/${post.id}`} className="block whitespace-pre-line">{post.body}</Link>
        {post.embed_url && (
          <div className="aspect-video overflow-hidden rounded-lg border">
            <iframe
              src={post.embed_url}
              className="h-full w-full"
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              title={`Video from ${post.org.name}`}
            />
          </div>
        )}
        {post.image_paths.map((path) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={path} src={postImageUrl(path)} alt="" className="w-full rounded-lg border" loading="lazy" />
        ))}
        <ShareButton path={`/p/${post.id}`} title={`${post.org.name} on imnet`} orgId={post.org_id} postId={post.id} />
      </CardContent>
    </Card>
  )
}
