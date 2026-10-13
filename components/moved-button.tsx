"use client"

import { useOptimistic, useTransition } from "react"
import { toggleMoved } from "@/app/actions"
import { cn } from "@/lib/utils"

// Private signal: only the org sees a total. No public counts (design principle #4).
export function MovedButton({ postId, moved }: { postId: string; moved: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(moved)
  const [, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={optimistic}
        onClick={() =>
          startTransition(async () => {
            setOptimistic(!optimistic)
            await toggleMoved(postId, optimistic)
          })
        }
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          optimistic ? "border-marigold bg-marigold text-foreground" : "border-border bg-card hover:border-marigold hover:bg-marigold-soft",
        )}
      >
        {optimistic ? "This moved you" : "This moved me"}
      </button>
      <span className="text-sm text-muted-foreground">Only {optimistic ? "the nonprofit sees this, as a total" : "the nonprofit will see this, as a total"}.</span>
    </div>
  )
}
