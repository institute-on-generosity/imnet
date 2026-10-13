import Link from "next/link"
import { cn } from "@/lib/utils"
import { postImageUrl } from "@/lib/queries"
import type { Post } from "@/lib/types"
import { OrgMark } from "./org-mark"
import { PostKindLabel } from "./post-kind"
import { ShareButton } from "./share-button"

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// A story in the feed: who, what happened, and the media. Not boxed: the story is the unit.
export function PostCard({ post, full = false, hideOrg = false }: { post: Post; full?: boolean; hideOrg?: boolean }) {
  const body = <p className={cn("story whitespace-pre-line", full && "text-[1.3125rem] leading-[1.65]")}>{post.body}</p>

  return (
    <article className="space-y-4">
      <header className="flex items-center gap-3">
        {!hideOrg && <OrgMark org={post.org} />}
        <div className="min-w-0 flex-1">
          {!hideOrg && (
            <Link href={`/o/${post.org.slug}`} className="block truncate font-medium hover:underline">
              {post.org.name}
            </Link>
          )}
          <p className="text-sm text-muted-foreground">
            <PostKindLabel kind={post.kind} />
          </p>
        </div>
        <time className="self-start text-sm text-muted-foreground" dateTime={post.created_at}>
          {shortDate(post.created_at)}
        </time>
      </header>

      {full ? body : <Link href={`/p/${post.id}`} className="block">{body}</Link>}

      {post.embed_url && (
        <div className="aspect-video overflow-hidden rounded-2xl bg-muted">
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
        <img key={path} src={postImageUrl(path)} alt="" className="w-full rounded-2xl" loading="lazy" />
      ))}

      <footer className="flex items-center gap-2">
        <ShareButton path={`/p/${post.id}`} title={`${post.org.name} on imnet`} orgId={post.org_id} postId={post.id} />
      </footer>
    </article>
  )
}

// hideOrg: on an org's own profile, every post is theirs, so skip the repeated name.
export function Feed({ posts, empty, hideOrg = false }: { posts: Post[]; empty: React.ReactNode; hideOrg?: boolean }) {
  if (posts.length === 0) return <div className="py-10 text-muted-foreground">{empty}</div>
  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <div key={post.id} className="py-8 first:pt-2">
          <PostCard post={post} hideOrg={hideOrg} />
        </div>
      ))}
    </div>
  )
}
