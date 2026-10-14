"use client"

import { HandHeart } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

export const PRIVATE_NOTE = "Only the nonprofit sees this, as a total"
const ICON_BUTTON = "inline-flex size-9 items-center justify-center rounded-full transition-colors"

// Private signal: only the org sees a total. No public counts (design principle #4).
export function MovedButton({ postId, moved, signedIn = true }: { postId: string; moved: boolean; signedIn?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(moved)
  const [, startTransition] = useTransition()

  if (!signedIn) {
    return (
      <IconTip label="This moved me (sign in)">
        <Link href="/login" className={cn(ICON_BUTTON, "text-muted-foreground hover:bg-muted")}>
          <HandHeart className="size-5" aria-hidden />
        </Link>
      </IconTip>
    )
  }
  return (
    <IconTip label={optimistic ? "This moved you (private)" : "This moved me (private)"}>
      <button
        type="button"
        aria-pressed={optimistic}
        onClick={() =>
          startTransition(async () => {
            setOptimistic(!optimistic)
            await sendSignal({ kind: "moved", id: postId, on: !optimistic }).catch(() => {})
          })
        }
        className={cn(ICON_BUTTON, optimistic ? "bg-marigold-soft text-marigold" : "text-muted-foreground hover:bg-muted")}
      >
        <HandHeart className="size-5" aria-hidden />
      </button>
    </IconTip>
  )
}
