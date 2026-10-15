"use client"

import { Eye, EyeOff } from "lucide-react"
import { useSignalToggle } from "@/lib/use-signal-toggle"
import type { OrgType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

// Follows are private. This opts in to showing support on your public profile (self-reported).
export function SupporterToggle({ orgId, orgType, supporter }: { orgId: string; orgType: OrgType; supporter: boolean }) {
  const [on, toggle] = useSignalToggle("supporter", orgId, supporter)
  const what = orgType === "foundation" ? "I give through this fund" : "I support this nonprofit"
  const Icon = on ? Eye : EyeOff

  return (
    <IconTip label={on ? `"${what}" shown on your profile` : `Show "${what}" on my profile`}>
      <button
        type="button"
        aria-pressed={on}
        onClick={toggle}
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
