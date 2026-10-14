import { Trash2 } from "lucide-react"
import Link from "next/link"
import { deleteComment } from "@/app/actions"
import type { Comment } from "@/lib/queries"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CommentForm } from "./comment-form"
import { IconTip } from "./icon-tip"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  if (mins < 43_200) return `${Math.round(mins / 1440)}d`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

type Props = { postId: string; org: OrgSummary; comments: Comment[]; userId: string | null; isStaff: boolean }

// Conversation under a post: oldest first, no likes, no counts. Staff can reply as the org.
export function Comments({ postId, org, comments, userId, isStaff }: Props) {
  return (
    <Panel id="comments" aria-labelledby="comments-title" className="scroll-mt-20 p-4">
      <h2 id="comments-title" className="font-sans text-base font-semibold tracking-normal">Comments</h2>
      {comments.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No comments yet. Say what this meant to you.</p>}
      <ul className="mt-3 space-y-3">
        {comments.map((c) => {
          const name = c.as_org ? org.name : (c.author.display_name ?? `@${c.author.handle}`)
          return (
            <li key={c.id} className="flex gap-2.5">
              {c.as_org ? (
                <OrgMark org={org} size="sm" />
              ) : (
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf-soft text-xs font-semibold text-leaf">{name.replace("@", "").charAt(0).toUpperCase()}</span>
              )}
              <div className={cn("min-w-0 flex-1 rounded-lg px-3 py-2", c.as_org ? "bg-leaf-soft" : "bg-muted/60")}>
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  {c.as_org ? (
                    <Link href={`/o/${org.slug}`} className="font-semibold hover:underline">{name}</Link>
                  ) : (
                    <Link href={`/u/${c.author.handle}`} className="font-semibold hover:underline">{name}</Link>
                  )}
                  {c.as_org && <span className="text-xs text-leaf">Team</span>}
                  <span className="text-xs text-muted-foreground"><time dateTime={c.created_at}>{ago(c.created_at)}</time></span>
                </p>
                <p className="mt-0.5 text-sm whitespace-pre-line break-words">{c.body}</p>
              </div>
              {(c.user_id === userId || isStaff) && (
                <form action={deleteComment.bind(null, c.id, postId)}>
                  <IconTip label="Remove comment">
                    <button type="submit" className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </IconTip>
                </form>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 border-t pt-3">
        {userId ? (
          <CommentForm postId={postId} orgName={isStaff ? org.name : undefined} />
        ) : (
          <p className="text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-leaf hover:underline">Sign in</Link> to comment.</p>
        )}
      </div>
    </Panel>
  )
}
