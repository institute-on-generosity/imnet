"use client"

import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSignalToggle } from "@/lib/use-signal-toggle"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

// full: labeled button (profiles). icon: round + / check button (sidebars, lists). person: follow a
// person (F-086); orgId is then their profile id.
export function FollowButton({ orgId, orgName, following, variant = "full", person, secondary }: { orgId: string; orgName?: string; following: boolean; variant?: "full" | "icon"; slug?: string; person?: boolean; secondary?: boolean }) {
  const [optimistic, toggle] = useSignalToggle(person ? "follow_person" : "follow", orgId, following)
  const Icon = optimistic ? Check : Plus

  if (variant === "icon") {
    return (
      <IconTip label={`${optimistic ? "Following" : "Follow"}${orgName ? ` ${orgName}` : ""}`}>
        <button
          type="button"
          aria-pressed={optimistic}
          onClick={toggle}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,transform] active:scale-90",
            optimistic ? "border-leaf bg-leaf-soft text-leaf" : "border-border hover:bg-muted",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      </IconTip>
    )
  }
  return (
    <Button variant={optimistic || secondary ? "outline" : "default"} aria-pressed={optimistic} onClick={toggle}>
      <Icon aria-hidden />
      {optimistic ? "Following" : "Follow"}
    </Button>
  )
}
