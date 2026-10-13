"use client"

import { Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { Button } from "@/components/ui/button"

// compact: the "+ Follow" pill used in sidebars and lists.
export function FollowButton({ orgId, following, compact = false }: { orgId: string; slug?: string; following: boolean; compact?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(following)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const Icon = optimistic ? Check : Plus

  return (
    <Button
      variant={optimistic || compact ? "outline" : "default"}
      size={compact ? "sm" : "default"}
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await sendSignal({ kind: "follow", id: orgId, on: !optimistic }).catch(() => {})
          router.refresh()
        })
      }
    >
      <Icon aria-hidden />
      {optimistic ? "Following" : "Follow"}
    </Button>
  )
}
