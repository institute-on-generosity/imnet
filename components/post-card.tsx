import Link from "next/link"
import { cn } from "@/lib/utils"
import { postImageUrl } from "@/lib/queries"
import type { Post } from "@/lib/types"
import { ExpandableText } from "./expandable-text"
import { MovedButton } from "./moved-button"
import { OrgMark } from "./org-mark"
import { PostKindLabel } from "./post-kind"
import { ShareButton } from "./share-button"
import { Panel } from "./shell"

const relative = (iso: string) => {
  const days = Math.floor((Date.parse(new Date().toISOString()) - Date.parse(iso)) / 86_400_000)
  if (days < 1) return "Today"
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

type CardProps = { post: Post; full?: boolean; moved?: boolean; signedIn?: boolean }

// A LinkedIn-style post: author header, text with "see more", media, then an action bar.
export function PostCard({ post, full = false, moved = false, signedIn = false }: CardProps) {
  return (
    <Panel>
      <header className="flex items-start gap-3 px-4 pt-4">
        <Link href={`/o/${post.org.slug}`} tabIndex={-1} aria-hidden><OrgMark org={post.org} size="md" /></Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/o/${post.org.slug}`} className="block truncate font-semibold hover:text-leaf hover:underline">{post.org.name}</Link>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <PostKindLabel kind={post.kind} />
            <time dateTime={post.created_at}>{relative(post.created_at)}</time>
          </p>
        </div>
      </header>

      <div className="px-4 pt-3">
        {full ? (
          <p className={cn("story whitespace-pre-line text-[1.1875rem]")}>{post.body}</p>
        ) : (
          <ExpandableText className="story text-[1.0625rem] leading-relaxed">{post.body}</ExpandableText>
        )}
      </div>

      {post.embed_url && (
        <div className="mt-3 aspect-video bg-muted">
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
        <img key={path} src={postImageUrl(path)} alt="" className="mt-3 w-full" loading="lazy" />
      ))}

      <footer className="mt-3 flex items-center gap-1 border-t px-2 py-1">
        <MovedButton postId={post.id} moved={moved} signedIn={signedIn} />
        <ShareButton path={`/p/${post.id}`} title={`${post.org.name} on imnet`} orgId={post.org_id} postId={post.id} />
        {!full && (
          <Link href={`/p/${post.id}`} className="ml-auto rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">
            Open
          </Link>
        )}
      </footer>
    </Panel>
  )
}

export function Feed({ posts, empty, movedIds, signedIn = false }: { posts: Post[]; empty: React.ReactNode; movedIds?: Set<string>; signedIn?: boolean }) {
  if (posts.length === 0) return <Panel className="p-6 text-muted-foreground">{empty}</Panel>
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} moved={movedIds?.has(post.id)} signedIn={signedIn} />
      ))}
    </div>
  )
}
