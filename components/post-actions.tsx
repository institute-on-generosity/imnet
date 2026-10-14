"use client"

import { Bookmark, BookmarkCheck, Check, HandHeart, MessageCircle, Send } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { logEvent } from "@/app/actions"
import { sendSignal } from "@/lib/send-signal"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PostComments, type CommentsData } from "./post-comments"

const BAR = "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted sm:flex-row sm:gap-1.5 sm:text-sm"

type Props = { postId: string; org: OrgSummary; moved: boolean; saved: boolean; signedIn: boolean; full?: boolean; comments?: CommentsData }

// LinkedIn's action bar (Moved · Comment · Share · Save) with the comment thread below it.
// "Moved" and Save are private; there are no counts.
export function PostActions({ postId, org, moved, saved, signedIn, full, comments }: Props) {
  const [open, setOpen] = useState(!!full)
  const [isMoved, setMoved] = useOptimistic(moved)
  const [isSaved, setSaved] = useOptimistic(saved)
  const [copied, setCopied] = useState(false)
  const [, start] = useTransition()

  const toggle = (kind: "moved" | "saved", on: boolean, set: (v: boolean) => void) =>
    start(async () => {
      set(on)
      await sendSignal({ kind, id: postId, on }).catch(() => {})
    })

  async function share() {
    const url = `${window.location.origin}/p/${postId}`
    try {
      if (navigator.share) await navigator.share({ title: `${org.name} on imnet`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      void logEvent("share", org.id, postId)
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
          <button type="button" aria-pressed={isMoved} aria-label={isMoved ? "This moved you (private)" : "This moved me (private)"} title="Private: only the organization sees a total"
            onClick={() => toggle("moved", !isMoved, setMoved)} className={cn(BAR, isMoved && "text-marigold")}>
            <HandHeart className="size-5" aria-hidden />Moved
          </button>
        ) : (
          <Link href="/login" aria-label="This moved me (sign in)" className={BAR}><HandHeart className="size-5" aria-hidden />Moved</Link>
        )}
        <button type="button" aria-expanded={open} aria-controls={open ? "comments" : undefined} onClick={() => setOpen(!open)} className={cn(BAR, open && "text-foreground")}>
          <MessageCircle className="size-5" aria-hidden />Comment
        </button>
        <button type="button" onClick={share} className={BAR}>
          {copied ? <Check className="size-5" aria-hidden /> : <Send className="size-5" aria-hidden />}{copied ? "Copied" : "Share"}
        </button>
        {signedIn ? (
          <button type="button" aria-pressed={isSaved} aria-label={isSaved ? "Saved (private)" : "Save"} onClick={() => toggle("saved", !isSaved, setSaved)} className={cn(BAR, isSaved && "text-leaf")}>
            <SaveIcon className="size-5" aria-hidden />{isSaved ? "Saved" : "Save"}
          </button>
        ) : (
          <Link href="/login" aria-label="Save (sign in)" className={BAR}><Bookmark className="size-5" aria-hidden />Save</Link>
        )}
      </div>
      {open && <PostComments postId={postId} org={org} initial={comments} />}
    </>
  )
}
