import { HandHeart, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { ORG_TYPE_LABEL, type OrgType } from "@/lib/types"

// Says at a glance whether an org does the work (nonprofit) or funds it (foundation).
export function OrgTypeBadge({ type, className }: { type: OrgType; className?: string }) {
  const Icon = type === "foundation" ? Landmark : HandHeart
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        type === "foundation" ? "bg-primary text-marigold" : "bg-leaf-soft text-leaf",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {ORG_TYPE_LABEL[type]}
    </span>
  )
}

// Compact marker next to a foundation's name in dense places (post headers, lists).
export function FoundationMark() {
  return (
    <span title="Foundation" className="inline-flex shrink-0 text-primary">
      <Landmark className="size-3.5" aria-hidden />
      <span className="sr-only">Foundation</span>
    </span>
  )
}

