"use client"

import { HandHeart } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { toggleMoved } from "@/app/actions"
import { cn } from "@/lib/utils"

const ACTION = "inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
export const PRIVATE_NOTE = "Only the nonprofit sees this, as a total"

// Private signal: only the org sees a total. No public counts (design principle #4).
export function MovedButton({ postId, moved, signedIn = true }: { postId: string; moved: boolean; signedIn?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(moved)
  const [, startTransition] = useTransition()

  if (!signedIn) {
    return (
      <Link href="/login" className={cn(ACTION, "text-muted-foreground hover:bg-muted")} title={PRIVATE_NOTE}>
        <HandHeart className="size-5" aria-hidden />
        Moved me
      </Link>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      title={PRIVATE_NOTE}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleMoved(postId, optimistic)
        })
      }
      className={cn(ACTION, optimistic ? "bg-marigold-soft text-foreground" : "text-muted-foreground hover:bg-muted")}
    >
      <HandHeart className={cn("size-5", optimistic && "text-marigold")} aria-hidden />
      {optimistic ? "Moved you" : "Moved me"}
    </button>
  )
}
