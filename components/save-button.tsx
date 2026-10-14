"use client"

import { Bookmark, BookmarkCheck } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

const ICON_BUTTON = "inline-flex size-9 items-center justify-center rounded-full transition-colors"

// Private bookmark; listed on /saved.
export function SaveButton({ postId, saved, signedIn }: { postId: string; saved: boolean; signedIn: boolean }) {
  const [on, setOn] = useOptimistic(saved)
  const [, start] = useTransition()
  if (!signedIn) {
    return (
      <IconTip label="Save (sign in)">
        <Link href="/login" className={cn(ICON_BUTTON, "text-muted-foreground hover:bg-muted")}><Bookmark className="size-5" aria-hidden /></Link>
      </IconTip>
    )
  }
  const Icon = on ? BookmarkCheck : Bookmark
  return (
    <IconTip label={on ? "Saved (only you can see this)" : "Save for later"}>
      <button
        type="button"
        aria-pressed={on}
        onClick={() =>
          start(async () => {
            setOn(!on)
            await sendSignal({ kind: "saved", id: postId, on: !on }).catch(() => {})
          })
        }
        className={cn(ICON_BUTTON, on ? "text-leaf" : "text-muted-foreground hover:bg-muted")}
      >
        <Icon className="size-5" aria-hidden />
      </button>
    </IconTip>
  )
}
