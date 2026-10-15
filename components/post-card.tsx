import { cn } from "@/lib/utils"
import Link from "@/components/intent-link"
import { getFollowedOrgIds, getFollowedPersonIds, getFollowerCounts, getLatestComments, getPostCounts, type PostCounts } from "@/lib/queries"
import type { Comment } from "@/lib/comments"
import { getUserId } from "@/lib/supabase/server"
import type { Grant, OrgSummary, Post } from "@/lib/types"
import { ExpandableText } from "./expandable-text"
import { FollowLink } from "./follow-link"
import { PostActions } from "./post-actions"
import type { CommentsData } from "./post-comments"
import { PostMenu } from "./post-menu"
import { PersonAvatar } from "./person-avatar"
import { GrantChips } from "./grant-chips"
import { GrantReportBanner } from "./grant-report-banner"
import { CallBlock } from "./call-block"
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
  followers?: number; following?: boolean; comments?: CommentsData; preview?: Comment & { more: boolean }
  canDelete?: boolean; counts?: PostCounts
}

// A LinkedIn post: author header (followers, time, Follow, ⋯), text with "…more", media,
// then the Moved · Comment · Share · Save bar and an inline comment thread. No counts.
export function PostCard({ post, full = false, moved = false, saved = false, signedIn = false, grants = [], context, followers, following, comments, preview, canDelete, counts }: CardProps) {
  return (
    <article className="rounded-xl border bg-card">
      {context && (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          From the portfolio of{" "}
          <Link href={`/o/${context.slug}`} className="font-medium text-foreground hover:underline">{context.name}</Link>, which you follow
        </p>
      )}
      <header className="flex items-start gap-2 px-4 pt-3">
        {post.org ? (
          <>
            <Link href={`/o/${post.org.slug}`} tabIndex={-1} aria-hidden className="mt-0.5"><OrgMark org={post.org} size="md" /></Link>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link href={`/o/${post.org.slug}`} className="truncate text-[15px] font-semibold hover:text-leaf hover:underline">{post.org.name}</Link>
                {post.org.org_type === "foundation" && <FoundationMark />}
              </div>
              <Meta post={post} lead={followers !== undefined ? followersLabel(followers) : undefined} kind={<PostKindLabel kind={post.kind} />} />
            </div>
            {following !== undefined && <FollowLink orgId={post.org.id} orgName={post.org.name} following={following} />}
          </>
        ) : post.author ? (
          // Donor post (F-079): the person is the author.
          <>
            <Link href={`/u/${post.author.handle}`} tabIndex={-1} aria-hidden className="mt-0.5">
              <PersonAvatar name={post.author.display_name ?? post.author.handle} avatarUrl={post.author.avatar_url} size="lg" />
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={`/u/${post.author.handle}`} className="block truncate text-[15px] font-semibold hover:text-leaf hover:underline">{post.author.display_name ?? `@${post.author.handle}`}</Link>
              {post.author.bio && <p className="mt-0.5 truncate text-xs text-muted-foreground">{post.author.bio}</p>}
              <Meta post={post} />
            </div>
            {following !== undefined && post.author_id && <FollowLink orgId={post.author_id} orgName={post.author.display_name ?? post.author.handle} following={following} person />}
          </>
        ) : null}
        <PostMenu postId={post.id} signedIn={signedIn} canDelete={canDelete} />
      </header>

      {post.report_grant && <GrantReportBanner grant={post.report_grant} />}

      <div className="px-4 pt-3">
        {full ? (
          <p className={cn("story whitespace-pre-line text-[1.1875rem]")}>{post.body}</p>
        ) : (
          <ExpandableText className="story text-[1.0625rem] leading-relaxed">{post.body}</ExpandableText>
        )}
      </div>

      {post.about_org && <Spotlight org={post.about_org} />}
      {post.kind === "open_call" && <OpenCallBlock post={post} />}
      <CallBlock post={post} />
      <PostMedia post={post} />
      <GrantChips grants={grants} />

      <div className="mt-2">
        <PostActions postId={post.id} org={post.org} title={post.org?.name ?? post.author?.display_name ?? "imnet"} moved={moved} saved={saved} signedIn={signedIn} full={full} comments={comments} preview={preview} counts={counts} />
      </div>
    </article>
  )
}

type FeedProps = { posts: Post[]; empty: React.ReactNode; movedIds?: Set<string>; savedIds?: Set<string>; signedIn?: boolean; grantsByPost?: Map<string, Grant[]>; context?: Map<string, OrgSummary> }

// Fetches the header details (follower counts, whether you follow) for the whole page at once.
export async function Feed({ posts, empty, movedIds, savedIds, signedIn = false, grantsByPost, context, hideFollow }: FeedProps & { hideFollow?: boolean }) {
  if (posts.length === 0) return <Panel className="p-6 text-muted-foreground">{empty}</Panel>
  const userId = signedIn ? await getUserId() : null
  const [counts, followed, followedPeople, previews, postCounts] = await Promise.all([
    getFollowerCounts(posts.flatMap((p) => (p.org_id ? [p.org_id] : []))),
    userId ? getFollowedOrgIds(userId) : Promise.resolve([]),
    userId ? getFollowedPersonIds(userId) : Promise.resolve([]),
    getLatestComments(posts.map((p) => p.id)),
    getPostCounts(posts.map((p) => p.id)),
  ])
  const followedSet = new Set([...followed, ...followedPeople])
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
          followers={post.org_id ? (counts.get(post.org_id) ?? 0) : undefined}
          following={!userId || hideFollow ? undefined : post.org_id ? followedSet.has(post.org_id) : post.author_id && post.author_id !== userId ? followedSet.has(post.author_id) : undefined}
          canDelete={!!userId && !post.org_id && post.author_id === userId}
          preview={previews.get(post.id)}
          counts={postCounts.get(post.id)}
        />
      ))}
    </div>
  )
}

// A donor post's spotlight: the nonprofit or foundation they're spreading the word about.
function Spotlight({ org }: { org: OrgSummary & { mission: string | null } }) {
  return (
    <Link href={`/o/${org.slug}`} className="mx-4 mt-3 flex items-center gap-3 rounded-lg border bg-muted/40 p-3 hover:bg-muted">
      <OrgMark org={org} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold">{org.name}{org.org_type === "foundation" && <FoundationMark />}</p>
        {org.mission && <p className="line-clamp-2 text-sm text-muted-foreground">{org.mission}</p>}
      </div>
      <span className="shrink-0 rounded-full border bg-card px-3 py-1 text-sm font-semibold text-leaf">View</span>
    </Link>
  )
}

// F-096: one quiet meta line under the name (followers, post type, time, edited), in the faint
// tone so it sits below the name and the headline. Every post is public, so no globe.
function Meta({ post, lead, kind }: { post: Post; lead?: string; kind?: React.ReactNode }) {
  const parts: React.ReactNode[] = []
  if (lead) parts.push(<span key="lead" className="truncate">{lead}</span>)
  if (kind) parts.push(<span key="kind" className="shrink-0">{kind}</span>)
  parts.push(
    <Link key="time" href={`/p/${post.id}`} aria-label={`${relative(post.created_at)} ago, open post`} className="shrink-0 hover:text-leaf hover:underline">
      <time dateTime={post.created_at}>{relative(post.created_at)}</time>
    </Link>,
  )
  if (post.edited_at) parts.push(<span key="edited" className="shrink-0" title={`Edited ${new Date(post.edited_at).toLocaleString("en-US")}`}>Edited</span>)
  return (
    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-faint">
      {parts.flatMap((part, i) => (i ? [<span key={`dot${i}`} aria-hidden>·</span>, part] : [part]))}
    </p>
  )
}
