"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Icon-only buttons and links: the label is both the tooltip and the accessible name.
export function IconTip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
