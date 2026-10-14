"use client"

import { useOptimistic, useTransition } from "react"
import { setDonorBadge } from "@/app/actions"

// Opt-in: show "Donor" on your comments on posts from organizations you've logged gifts to.
export function DonorBadgeToggle({ on: initial }: { on: boolean }) {
  const [on, setOn] = useOptimistic(initial)
  const [, start] = useTransition()
  return (
    <label id="donor-badge" className="flex scroll-mt-20 items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => start(async () => { setOn(e.target.checked); await setDonorBadge(e.target.checked) })}
        className="mt-0.5 size-4 accent-[var(--leaf)]"
      />
      <span>
        Show a <span className="font-semibold">Donor</span> badge on my comments for organizations I&apos;ve logged gifts to
        <span className="block text-xs text-muted-foreground">Only the badge is shown. Amounts and dates stay private.</span>
      </span>
    </label>
  )
}
