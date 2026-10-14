"use client"

import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import type { OrgType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

// Follows are private. This opts in to showing support on your public profile (self-reported).
export function SupporterToggle({ orgId, orgType, supporter }: { orgId: string; orgType: OrgType; supporter: boolean }) {
  const [on, setOn] = useOptimistic(supporter)
  const [, start] = useTransition()
  const router = useRouter()
  const what = orgType === "foundation" ? "I give through this fund" : "I support this nonprofit"
  const Icon = on ? Eye : EyeOff

  return (
    <IconTip label={on ? `"${what}" is on your public profile. Click to hide.` : `Show "${what}" on my public profile (self-reported)`}>
      <button
        type="button"
        aria-pressed={on}
        onClick={() =>
          start(async () => {
            setOn(!on)
            await sendSignal({ kind: "supporter", id: orgId, on: !on }).catch(() => {})
            router.refresh()
          })
        }
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full border transition-colors",
          on ? "border-leaf bg-leaf-soft text-leaf" : "border-border bg-background text-muted-foreground hover:bg-muted",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </IconTip>
  )
}
