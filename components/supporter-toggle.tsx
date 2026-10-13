"use client"

import { Check, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { Button } from "@/components/ui/button"
import type { OrgType } from "@/lib/types"

// Follows are private. This opts in to showing support on your public profile (self-reported).
export function SupporterToggle({ orgId, orgType, supporter }: { orgId: string; orgType: OrgType; supporter: boolean }) {
  const [on, setOn] = useOptimistic(supporter)
  const [, start] = useTransition()
  const router = useRouter()
  const label = orgType === "foundation" ? "I give through this fund" : "I support this nonprofit"

  return (
    <Button
      variant="outline"
      aria-pressed={on}
      title="Shows on your public profile. Self-reported: imnet doesn't see your donations."
      onClick={() =>
        start(async () => {
          setOn(!on)
          await sendSignal({ kind: "supporter", id: orgId, on: !on }).catch(() => {})
          router.refresh()
        })
      }
    >
      {on ? <Check aria-hidden /> : <Eye aria-hidden />}
      {on ? `${label} (on your profile)` : `${label}: show on my profile`}
    </Button>
  )
}
