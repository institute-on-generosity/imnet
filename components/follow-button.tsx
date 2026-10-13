"use client"

import { Check, Plus } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toggleFollow } from "@/app/actions"
import { Button } from "@/components/ui/button"

// compact: the "+ Follow" pill used in sidebars and lists.
export function FollowButton({ orgId, slug, following, compact = false }: { orgId: string; slug: string; following: boolean; compact?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(following)
  const [, startTransition] = useTransition()
  const Icon = optimistic ? Check : Plus

  return (
    <Button
      variant={optimistic || compact ? "outline" : "default"}
      size={compact ? "sm" : "default"}
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleFollow(orgId, slug, optimistic)
        })
      }
    >
      <Icon aria-hidden />
      {optimistic ? "Following" : "Follow"}
    </Button>
  )
}
