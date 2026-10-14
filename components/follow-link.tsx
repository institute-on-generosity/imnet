"use client"

import { Check, Plus } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"

// LinkedIn's "+ Follow" in a post header.
export function FollowLink({ orgId, orgName, following }: { orgId: string; orgName: string; following: boolean }) {
  const [on, setOn] = useOptimistic(following)
  const [, start] = useTransition()
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? "Following" : "Follow"} ${orgName}`}
      onClick={() => start(async () => { setOn(!on); await sendSignal({ kind: "follow", id: orgId, on: !on }).catch(() => {}) })}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition-colors", on ? "text-muted-foreground hover:bg-muted" : "text-leaf hover:bg-leaf-soft")}
    >
      {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {on ? "Following" : "Follow"}
    </button>
  )
}
