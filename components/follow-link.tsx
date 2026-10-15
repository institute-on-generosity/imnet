"use client"

import { Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"

// LinkedIn's "+ Follow" in a post header.
// person: follow a person (F-086) instead of an org.
export function FollowLink({ orgId, orgName, following, person }: { orgId: string; orgName: string; following: boolean; person?: boolean }) {
  const [on, setOn] = useOptimistic(following)
  const [, start] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? "Following" : "Follow"} ${orgName}`}
      onClick={() => start(async () => { setOn(!on); await sendSignal({ kind: person ? "follow_person" : "follow", id: orgId, on: !on }).catch(() => {}); router.refresh() })}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-md py-1 pr-2 pl-1.5 text-sm font-semibold transition-colors", on ? "text-muted-foreground hover:bg-muted" : "text-leaf hover:bg-leaf-soft")}
    >
      {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {on ? "Following" : "Follow"}
    </button>
  )
}
