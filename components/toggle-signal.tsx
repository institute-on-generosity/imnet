"use client"

import { Check, Hand, Plus } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { sendSignal } from "@/lib/send-signal"
import { cn } from "@/lib/utils"

const PILL = "inline-flex h-fit shrink-0 items-center gap-1 rounded-full border font-semibold transition-colors"
// Leading icon: 2px less padding on its side (optical alignment).
const SIZE = { md: "pl-2.5 pr-3 py-1 text-sm", sm: "pl-2 pr-2.5 py-0.5 text-xs" }

// Private one-click toggles: RSVP to an event, or raise a hand for a volunteer need.
// Only you and the org's staff see them; there are no public counts.
export function ToggleSignal({ kind, id, on: initial, signedIn, label, size = "md" }: { kind: "rsvp" | "interest"; id: string; on: boolean; signedIn: boolean; label: string; size?: "sm" | "md" }) {
  const [on, setOn] = useOptimistic(initial)
  const [, start] = useTransition()
  const [offText, onText] = kind === "rsvp" ? ["Going?", "Going"] : ["I'm interested", "Interested"]
  const Icon = on ? Check : kind === "rsvp" ? Plus : Hand
  if (!signedIn) {
    return <Link href="/login" className={cn(PILL, SIZE[size], "text-muted-foreground hover:bg-muted")}><Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />{offText}<span className="sr-only"> {label} (sign in)</span></Link>
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          setOn(!on)
          await sendSignal({ kind, id, on: !on }).catch(() => {})
        })
      }
      className={cn(PILL, SIZE[size], on ? "border-leaf bg-leaf-soft text-leaf" : "text-muted-foreground hover:bg-muted")}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {on ? onText : offText}
      <span className="sr-only"> {label}</span>
    </button>
  )
}
