import { Earth } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { getFollowedOrgIds, getFollowerCounts } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import type { Grant, OrgSummary, Post } from "@/lib/types"
import { ExpandableText } from "./expandable-text"
import { FollowLink } from "./follow-link"
import { PostActions } from "./post-actions"
import type { CommentsData } from "./post-comments"
import { PostMenu } from "./post-menu"
import { GrantChips } from "./grant-chips"
import { GrantReportBanner } from "./grant-report-banner"
import { OpenCallBlock } from "./open-call-block"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { PostKindLabel } from "./post-kind"
import { PostMedia } from "./post-media"
import { Panel } from "./shell"

const relative = (iso: string) => {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60_000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  const days = Math.floor(mins / 1440)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
const followersLabel = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "follower" : "followers"}`

// context: the followed foundation this post appears for (portfolio), shown above the header.
// following: undefined hides the header's Follow button (signed out, or on the org's own page).
type CardProps = {
  post: Post; full?: boolean; moved?: boolean; saved?: boolean; signedIn?: boolean; grants?: Grant[]; context?: OrgSummary
  followers?: number; following?: boolean; comments?: CommentsData
}

// A LinkedIn post: author header (followers, time, Follow, ⋯), text with "…more", media,
// then the Moved · Comment · Share · Save bar and an inline comment thread. No counts.
export function PostCard({ post, full = false, moved = false, saved = false, signedIn = false, grants = [], context, followers, following, comments }: CardProps) {
  return (
    <article className="rounded-xl border bg-card">
      {context && (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          From the portfolio of{" "}
          <Link href={`/o/${context.slug}`} className="font-medium text-foreground hover:underline">{context.name}</Link>, which you follow
        </p>
      )}
      <header className="flex items-start gap-2 px-4 pt-3">
        <Link href={`/o/${post.org.slug}`} tabIndex={-1} aria-hidden className="mt-0.5"><OrgMark org={post.org} size="md" /></Link>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/o/${post.org.slug}`} className="truncate font-semibold hover:text-leaf hover:underline">{post.org.name}</Link>
            {post.org.org_type === "foundation" && <FoundationMark />}
          </div>
          {followers !== undefined && <p className="mt-0.5 truncate text-xs text-muted-foreground">{followersLabel(followers)}</p>}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <PostKindLabel kind={post.kind} />
            <span aria-hidden>•</span>
            <Link href={`/p/${post.id}`} aria-label={`${relative(post.created_at)} ago, open post`} className="hover:text-leaf hover:underline">
              <time dateTime={post.created_at}>{relative(post.created_at)}</time>
            </Link>
            {post.edited_at && (
              <>
                <span aria-hidden>•</span>
                <span title={`Edited ${new Date(post.edited_at).toLocaleString("en-US")}`}>Edited</span>
              </>
            )}
            <span aria-hidden>•</span>
            <Earth className="size-3" aria-label="Public" />
          </p>
        </div>
        {following !== undefined && <FollowLink orgId={post.org.id} orgName={post.org.name} following={following} />}
        <PostMenu postId={post.id} signedIn={signedIn} />
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

      <div className="mt-2">
        <PostActions postId={post.id} org={post.org} moved={moved} saved={saved} signedIn={signedIn} full={full} comments={comments} />
      </div>
    </article>
  )
}

type FeedProps = { posts: Post[]; empty: React.ReactNode; movedIds?: Set<string>; savedIds?: Set<string>; signedIn?: boolean; grantsByPost?: Map<string, Grant[]>; context?: Map<string, OrgSummary> }

// Fetches the header details (follower counts, whether you follow) for the whole page at once.
export async function Feed({ posts, empty, movedIds, savedIds, signedIn = false, grantsByPost, context, hideFollow }: FeedProps & { hideFollow?: boolean }) {
  if (posts.length === 0) return <Panel className="p-6 text-muted-foreground">{empty}</Panel>
  const userId = signedIn ? await getUserId() : null
  const [counts, followed] = await Promise.all([getFollowerCounts(posts.map((p) => p.org_id)), userId ? getFollowedOrgIds(userId) : Promise.resolve([])])
  const followedSet = new Set(followed)
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          moved={movedIds?.has(post.id)}
          saved={savedIds?.has(post.id)}
          signedIn={signedIn}
          grants={grantsByPost?.get(post.id)}
          context={context?.get(post.id)}
          followers={counts.get(post.org_id) ?? 0}
          following={userId && !hideFollow ? followedSet.has(post.org_id) : undefined}
        />
      ))}
    </div>
  )
}
