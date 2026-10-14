"use client"

import { Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

// full: labeled button (profiles). icon: round + / check button (sidebars, lists).
export function FollowButton({ orgId, orgName, following, variant = "full" }: { orgId: string; orgName?: string; following: boolean; variant?: "full" | "icon"; slug?: string }) {
  const [optimistic, setOptimistic] = useOptimistic(following)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const Icon = optimistic ? Check : Plus
  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic)
      await sendSignal({ kind: "follow", id: orgId, on: !optimistic }).catch(() => {})
      router.refresh()
    })

  if (variant === "icon") {
    return (
      <IconTip label={`${optimistic ? "Following" : "Follow"}${orgName ? ` ${orgName}` : ""}`}>
        <button
          type="button"
          aria-pressed={optimistic}
          onClick={toggle}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            optimistic ? "border-leaf bg-leaf-soft text-leaf" : "border-border hover:bg-muted",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      </IconTip>
    )
  }
  return (
    <Button variant={optimistic ? "outline" : "default"} aria-pressed={optimistic} onClick={toggle}>
      <Icon aria-hidden />
      {optimistic ? "Following" : "Follow"}
    </Button>
  )
}
