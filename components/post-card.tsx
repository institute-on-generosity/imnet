import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Grant, OrgSummary, Post } from "@/lib/types"
import { ExpandableText } from "./expandable-text"
import { GrantChips } from "./grant-chips"
import { GrantReportBanner } from "./grant-report-banner"
import { MovedButton } from "./moved-button"
import { OpenCallBlock } from "./open-call-block"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { IconTip } from "./icon-tip"
import { PostKindLabel } from "./post-kind"
import { PostMedia } from "./post-media"
import { ShareButton } from "./share-button"
import { Panel } from "./shell"

const relative = (iso: string) => {
  const days = Math.floor((Date.parse(new Date().toISOString()) - Date.parse(iso)) / 86_400_000)
  if (days < 1) return "Today"
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// context: the followed foundation this post appears for (portfolio), shown above the header.
type CardProps = { post: Post; full?: boolean; moved?: boolean; signedIn?: boolean; grants?: Grant[]; context?: OrgSummary }

// A LinkedIn-style post: author header, text with "see more", media, then an action bar.
export function PostCard({ post, full = false, moved = false, signedIn = false, grants = [], context }: CardProps) {
  return (
    <Panel>
      {context && (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          From the portfolio of{" "}
          <Link href={`/o/${context.slug}`} className="font-medium text-foreground hover:underline">{context.name}</Link>, which you follow
        </p>
      )}
      <header className="flex items-start gap-3 px-4 pt-4">
        <Link href={`/o/${post.org.slug}`} tabIndex={-1} aria-hidden><OrgMark org={post.org} size="md" /></Link>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/o/${post.org.slug}`} className="truncate font-semibold hover:text-leaf hover:underline">{post.org.name}</Link>
            {post.org.org_type === "foundation" && <FoundationMark />}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <PostKindLabel kind={post.kind} />
            <time dateTime={post.created_at}>{relative(post.created_at)}</time>
          </p>
        </div>
      </header>

      {post.report_grant && <GrantReportBanner grant={post.report_grant} />}

      <div className="px-4 pt-3">
        {full ? (
          <p className={cn("story whitespace-pre-line text-[1.1875rem]")}>{post.body}</p>
        ) : (
          <ExpandableText className="story text-[1.0625rem] leading-relaxed">{post.body}</ExpandableText>
        )}
      </div>

      {post.kind === "open_call" && <OpenCallBlock post={post} />}
      <PostMedia post={post} />
      <GrantChips grants={grants} />

      <footer className="mt-2 flex items-center gap-0.5 px-2 pb-1.5">
        <MovedButton postId={post.id} moved={moved} signedIn={signedIn} />
        <ShareButton path={`/p/${post.id}`} title={`${post.org.name} on imnet`} orgId={post.org_id} postId={post.id} />
        {!full && (
          <IconTip label="Open post">
            <Link href={`/p/${post.id}`} className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <ArrowUpRight className="size-5" aria-hidden />
            </Link>
          </IconTip>
        )}
      </footer>
    </Panel>
  )
}

type FeedProps = { posts: Post[]; empty: React.ReactNode; movedIds?: Set<string>; signedIn?: boolean; grantsByPost?: Map<string, Grant[]>; context?: Map<string, OrgSummary> }

export function Feed({ posts, empty, movedIds, signedIn = false, grantsByPost, context }: FeedProps) {
  if (posts.length === 0) return <Panel className="p-6 text-muted-foreground">{empty}</Panel>
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} moved={movedIds?.has(post.id)} signedIn={signedIn} grants={grantsByPost?.get(post.id)} context={context?.get(post.id)} />
      ))}
    </div>
  )
}
