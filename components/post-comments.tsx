"use client"

import { HandHeart } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { deleteComment, loadComments, postComment } from "@/app/actions"
import { ago, type Comment, type Thread } from "@/lib/comments"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OrgMark } from "./org-mark"

export type CommentsData = NonNullable<Awaited<ReturnType<typeof loadComments>>>
type Viewer = CommentsData["viewer"]

const PAGE = 5

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-leaf-soft font-semibold text-leaf", size === "md" ? "size-10 text-base" : "size-8 text-sm")}>
      {name.replace("@", "").charAt(0).toUpperCase()}
    </span>
  )
}

// LinkedIn-style comments: composer on top, newest comments first, replies nested one level.
// No likes and no counts (design principle #4).
export function PostComments({ postId, org, initial }: { postId: string; org: OrgSummary; initial?: CommentsData }) {
  const [data, setData] = useState<CommentsData | null>(initial ?? null)
  const [shown, setShown] = useState(PAGE)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [, start] = useTransition()

  const refresh = () => start(async () => setData(await loadComments(postId)))
  useEffect(() => {
    if (!initial) start(async () => setData(await loadComments(postId)))
  }, [initial, postId])

  if (!data) return <p className="px-4 pb-4 text-sm text-muted-foreground">Loading comments…</p>
  const { threads, viewer, isStaff, donorHint } = data

  return (
    <section id="comments" aria-label="Comments" className="scroll-mt-20 px-4 pt-1 pb-3">
      {viewer ? (
        <Composer postId={postId} org={org} viewer={viewer} isStaff={isStaff} onPosted={refresh} />
      ) : (
        <p className="py-2 text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-leaf hover:underline">Sign in</Link> to comment.</p>
      )}
      {donorHint && (
        <p className="py-1 pl-12 text-xs text-muted-foreground">
          You&apos;ve logged a gift to {org.name}. <Link href="/giving#donor-badge" className="font-semibold text-leaf hover:underline">Show a Donor badge on your comments</Link>
        </p>
      )}
      {threads.length === 0 && <p className="py-2 text-sm text-muted-foreground">No comments yet. Say what this meant to you.</p>}
      <ul className="mt-2 space-y-3">
        {threads.slice(0, shown).map((t) => (
          <li key={t.id}>
            <CommentItem comment={t} org={org} viewer={viewer} isStaff={isStaff} postId={postId} onChange={refresh} onReply={() => setReplyTo(replyTo === t.id ? null : t.id)} />
            {(t.replies.length > 0 || replyTo === t.id) && (
              <ul className="mt-2 ml-12 space-y-2">
                {t.replies.map((r) => (
                  <li key={r.id}>
                    <CommentItem comment={r} org={org} viewer={viewer} isStaff={isStaff} postId={postId} onChange={refresh} onReply={() => setReplyTo(t.id)} small />
                  </li>
                ))}
                {replyTo === t.id && viewer && (
                  <li>
                    <Composer postId={postId} org={org} viewer={viewer} isStaff={isStaff} parent={t} onPosted={() => { setReplyTo(null); refresh() }} small />
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {threads.length > shown && (
        <button type="button" onClick={() => setShown(shown + 10)} className="mt-2 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
          Load more comments
        </button>
      )}
    </section>
  )
}

// preview: the feed's one-comment preview (body clamped, no actions; clicking opens the thread).
export function CommentItem({ comment: c, org, viewer, isStaff, postId, onChange, onReply, small, preview }: {
  comment: Comment | Thread; org: OrgSummary; viewer: Viewer; isStaff: boolean; postId: string; onChange: () => void; onReply: () => void; small?: boolean; preview?: boolean
}) {
  const [, start] = useTransition()
  const name = c.as_org ? org.name : (c.author.display_name ?? `@${c.author.handle}`)
  const href = c.as_org ? `/o/${org.slug}` : `/u/${c.author.handle}`
  const headline = c.as_org ? (org.org_type === "foundation" ? "Foundation" : "Nonprofit") : c.author.bio
  const canDelete = !!viewer && (c.user_id === viewer.id || isStaff)
  return (
    <div className="flex gap-2">
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
        {c.as_org ? <OrgMark org={org} size="sm" /> : <Avatar name={name} size={small ? "sm" : "md"} />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-lg rounded-tl-none bg-muted/70 px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1.5 text-sm">
                <Link href={href} className="truncate font-semibold hover:text-leaf hover:underline">{name}</Link>
                {c.as_org && <span className="shrink-0 rounded bg-muted-foreground/80 px-1 py-px text-[10px] font-semibold text-background">Author</span>}
                {c.donor && (
                  <span title={`Has given to ${org.name} (self-reported)`} className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-marigold-soft px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    <HandHeart className="size-3" aria-hidden />Donor<span className="sr-only">: has given to {org.name} (self-reported)</span>
                  </span>
                )}
              </p>
              {headline && <p className="truncate text-xs text-muted-foreground">{headline}</p>}
            </div>
            <time dateTime={c.created_at} className="shrink-0 text-xs text-muted-foreground">{ago(c.created_at)}</time>
          </div>
          <p className={cn("mt-1.5 text-sm whitespace-pre-line break-words", preview && "line-clamp-2")}>{c.body}</p>
        </div>
        {!preview && <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {viewer && <button type="button" onClick={onReply} className="rounded px-2 py-1 hover:bg-muted">Reply</button>}
          {canDelete && (
            <button type="button" onClick={() => start(async () => { await deleteComment(c.id, postId); onChange() })} className="rounded px-2 py-1 hover:bg-muted hover:text-destructive">
              Delete<span className="sr-only"> comment</span>
            </button>
          )}
        </div>}
      </div>
    </div>
  )
}

// Rounded "Add a comment…" box. The Post button appears once there's text. Staff tap their
// avatar to switch between commenting as themselves and as the org.
function Composer({ postId, org, viewer, isStaff, parent, onPosted, small }: {
  postId: string; org: OrgSummary; viewer: NonNullable<Viewer>; isStaff: boolean; parent?: Thread; onPosted: () => void; small?: boolean
}) {
  const [text, setText] = useState("")
  const [asOrg, setAsOrg] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (parent) ref.current?.focus() }, [parent])

  const submit = () =>
    start(async () => {
      const res = await postComment({ postId, parentId: parent?.id ?? null, body: text, asOrg })
      if (res.error) return setError(res.error)
      setText("")
      setError(null)
      onPosted()
    })

  const as = asOrg ? org.name : viewer.name
  return (
    <div className="flex items-start gap-2 py-1">
      {isStaff ? (
        <button type="button" onClick={() => setAsOrg(!asOrg)} aria-label={`Commenting as ${as}. Switch to ${asOrg ? viewer.name : org.name}`} title={`Commenting as ${as}`} className="shrink-0 rounded-full">
          {asOrg ? <OrgMark org={org} size="sm" /> : <Avatar name={viewer.name} size={small ? "sm" : "md"} />}
        </button>
      ) : (
        <Avatar name={viewer.name} size={small ? "sm" : "md"} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-2 rounded-3xl border bg-background px-4 py-2 focus-within:ring-2 focus-within:ring-ring/50">
          <textarea
            ref={ref}
            rows={1}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={parent ? "Add a reply" : "Add a comment"}
            placeholder={parent ? "Add a reply…" : "Add a comment…"}
            className="field-sizing-content min-h-6 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {isStaff && <p className="mt-1 px-2 text-xs text-muted-foreground">Commenting as {as}</p>}
        {error && <p className="mt-1 px-2 text-xs text-destructive">{error}</p>}
        {text.trim() && (
          <button type="button" onClick={submit} disabled={pending} className="mt-2 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {pending ? "Posting…" : parent ? "Reply" : "Post"}
          </button>
        )}
      </div>
    </div>
  )
}
