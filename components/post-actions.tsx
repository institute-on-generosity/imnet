"use client"

import { Bookmark, BookmarkCheck, Check, HandHeart, MessageCircle, Send } from "lucide-react"
import Link from "@/components/intent-link"
import { useState } from "react"
import { logEvent } from "@/app/actions"
import { useSignalToggle } from "@/lib/use-signal-toggle"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { Comment } from "@/lib/comments"
import { CommentItem, PostComments, type CommentsData } from "./post-comments"

const BAR = "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-xs font-semibold text-muted-foreground transition-[color,background-color,transform] hover:bg-muted active:scale-95 sm:flex-row sm:gap-1.5 sm:text-sm"

type Props = { postId: string; org: OrgSummary | null; title: string; moved: boolean; saved: boolean; signedIn: boolean; full?: boolean; comments?: CommentsData; preview?: Comment & { more: boolean }; counts?: { comments: number; moved: number | null } }

// LinkedIn's action bar (Moved · Comment · Share · Save) with the comment thread below it.
// "Moved" and Save are private; there are no counts.
export function PostActions({ postId, org, title, moved, saved, signedIn, full, comments, preview, counts }: Props) {
  const [open, setOpen] = useState(!!full)
  const [isMoved, toggleMoved] = useSignalToggle("moved", postId, moved)
  const [isSaved, toggleSaved] = useSignalToggle("saved", postId, saved)
  const [copied, setCopied] = useState(false)
  // F-094: the moved count only reaches the post's author and its org's team (null otherwise);
  // it moves with your own click so it never looks stale.
  const movedTotal = counts?.moved == null ? null : counts.moved + Number(isMoved) - Number(moved)
  const commentTotal = counts?.comments ?? 0

  async function share() {
    const url = `${window.location.origin}/p/${postId}`
    try {
      if (navigator.share) await navigator.share({ title: `${title} on imnet`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      if (org) void logEvent("share", org.id, postId)
    } catch {
      // Share sheet cancelled.
    }
  }

  const SaveIcon = isSaved ? BookmarkCheck : Bookmark
  return (
    <>
      <div className="mx-4 border-t" />
      <div className="flex items-stretch gap-1 px-2 py-1">
        {signedIn ? (
          <button type="button" aria-pressed={isMoved} aria-label={isMoved ? "This moved you (private)" : "This moved me (private)"} title={movedTotal != null ? "Only you see how many people this moved" : "Private: only the author sees a total"}
            onClick={toggleMoved} className={cn(BAR, isMoved && "text-marigold")}>
            <HandHeart className="size-5" aria-hidden />Moved{movedTotal ? <Count n={movedTotal} label="people moved (only you see this)" /> : null}
          </button>
        ) : (
          <Link href="/login" aria-label="This moved me (sign in)" className={BAR}><HandHeart className="size-5" aria-hidden />Moved</Link>
        )}
        <button type="button" aria-expanded={open} aria-controls={open ? "comments" : undefined} onClick={() => setOpen(!open)} className={cn(BAR, open && "text-foreground")}>
          <MessageCircle className="size-5" aria-hidden />Comment{commentTotal ? <Count n={commentTotal} label={commentTotal === 1 ? "comment" : "comments"} /> : null}
        </button>
        <button type="button" onClick={share} className={BAR}>
          {copied ? <Check className="size-5" aria-hidden /> : <Send className="size-5" aria-hidden />}{copied ? "Copied" : "Share"}
        </button>
        {signedIn ? (
          <button type="button" aria-pressed={isSaved} aria-label={isSaved ? "Saved (private)" : "Save"} onClick={toggleSaved} className={cn(BAR, isSaved && "text-leaf")}>
            <SaveIcon className="size-5" aria-hidden />{isSaved ? "Saved" : "Save"}
          </button>
        ) : (
          <Link href="/login" aria-label="Save (sign in)" className={BAR}><Bookmark className="size-5" aria-hidden />Save</Link>
        )}
      </div>
      {open && <PostComments postId={postId} org={org} initial={comments} />}
      {!open && preview && (
        // LinkedIn's comment preview: the newest comment; tap it (or the link) for the whole thread.
        <div className="px-4 pt-1 pb-3">
          {/* Clicking the bubble is a mouse shortcut; keyboard users use the button below (no nested controls). */}
          <div onClick={() => setOpen(true)} className="cursor-pointer">
            <CommentItem comment={preview} org={org} viewer={null} isStaff={false} postId={postId} onChange={() => {}} onReply={() => {}} preview />
          </div>
          <button type="button" onClick={() => setOpen(true)} className="mt-1 ml-10 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
            {preview.more ? "See more comments" : "Add a comment"}
          </button>
        </div>
      )}
    </>
  )
}

function Count({ n, label }: { n: number; label: string }) {
  return <span className="text-muted-foreground tabular-nums">{n}<span className="sr-only"> {label}</span></span>
}
