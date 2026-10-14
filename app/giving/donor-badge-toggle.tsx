"use client"

import { useOptimistic, useTransition } from "react"
import { setDonorBadge, setGivingTotals } from "@/app/actions"

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

// Opt-in: show the total and the split by cause on my profile (never individual gifts).
export function GivingTotalsToggle({ on: initial }: { on: boolean }) {
  const [on, setOn] = useOptimistic(initial)
  const [, start] = useTransition()
  return (
    <label id="giving-totals-toggle" className="flex scroll-mt-20 items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => start(async () => { setOn(e.target.checked); await setGivingTotals(e.target.checked) })}
        className="mt-0.5 size-4 accent-[var(--leaf)]"
      />
      <span>
        Show my <span className="font-semibold">giving totals</span> on my profile
        <span className="block text-xs text-muted-foreground">The total, the amount to each organization and the split by cause. Individual gifts and dates stay private.</span>
      </span>
    </label>
  )
}
