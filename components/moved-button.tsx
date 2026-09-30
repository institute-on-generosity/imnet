"use client"

import { useOptimistic, useTransition } from "react"
import { toggleMoved } from "@/app/actions"
import { Button } from "@/components/ui/button"

// Private signal: only the org sees a total. No public counts (design principle #4).
export function MovedButton({ postId, moved }: { postId: string; moved: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(moved)
  const [, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Button
        variant={optimistic ? "default" : "outline"}
        size="sm"
        onClick={() =>
          startTransition(async () => {
            setOptimistic(!optimistic)
            await toggleMoved(postId, optimistic)
          })
        }
      >
        {optimistic ? "This moved you" : "This moved me"}
      </Button>
      <span>Only the nonprofit sees this, as a total.</span>
    </div>
  )
}
