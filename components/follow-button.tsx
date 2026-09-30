"use client"

import { useOptimistic, useTransition } from "react"
import { toggleFollow } from "@/app/actions"
import { Button } from "@/components/ui/button"

export function FollowButton({ orgId, slug, following }: { orgId: string; slug: string; following: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(following)
  const [, startTransition] = useTransition()

  return (
    <Button
      variant={optimistic ? "outline" : "default"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleFollow(orgId, slug, optimistic)
        })
      }
    >
      {optimistic ? "Following" : "Follow"}
    </Button>
  )
}
