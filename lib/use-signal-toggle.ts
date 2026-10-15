"use client"

import { useRouter } from "next/navigation"
import { startTransition, useState } from "react"
import { sendSignal } from "@/lib/send-signal"

type Kind = Parameters<typeof sendSignal>[0]["kind"]

// One-click toggles (B-032). The button flips on click and stays flipped: plain state, not
// useOptimistic, which snapped back to the old value while the background refresh was in flight.
// Reverts only if the server says no. The refresh runs as a low-priority transition afterwards.
export function useSignalToggle(kind: Kind, id: string, initial: boolean) {
  const [on, setOn] = useState(initial)
  const [prev, setPrev] = useState(initial)
  const router = useRouter()
  if (initial !== prev) {
    // The server's value changed (e.g. after a refresh): adopt it.
    setPrev(initial)
    setOn(initial)
  }
  const toggle = () => {
    const next = !on
    setOn(next)
    sendSignal({ kind, id, on: next }).then(
      () => startTransition(() => router.refresh()),
      () => setOn(!next),
    )
  }
  return [on, toggle] as const
}
