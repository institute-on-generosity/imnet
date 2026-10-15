"use client"

import { useLayoutEffect, useRef } from "react"

// Sideways-scrolling chip row (B-033). Chips keep their order, so nothing moves under your
// pointer; on load the selected chip is scrolled into view only if it's hidden.
export function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const nav = ref.current
    const on = nav?.querySelector<HTMLElement>("[aria-current=page]")
    if (!nav || !on) return
    const n = nav.getBoundingClientRect(), c = on.getBoundingClientRect()
    if (c.left < n.left || c.right > n.right) nav.scrollLeft += c.left - n.left - 16
  }, [])
  return (
    <nav ref={ref} aria-label={label} className="overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max gap-1.5">{children}</div>
    </nav>
  )
}
