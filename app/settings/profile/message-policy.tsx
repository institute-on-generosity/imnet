"use client"

import { useState, useTransition } from "react"
import { setMessagePolicy } from "@/app/actions"
import { cn } from "@/lib/utils"

const OPTIONS = [
  ["everyone", "Everyone on imnet", "Any signed-in person can message you"],
  ["connected", "People I'm connected to", "People in your communities, or who follow you"],
  ["nobody", "Nobody", "No new messages; you can still reply in existing conversations"],
] as const
type Policy = (typeof OPTIONS)[number][0]

// F-123: who can start a direct message with you. Saved on change.
export function MessagePolicy({ initial }: { initial: Policy }) {
  const [policy, setPolicy] = useState<Policy>(initial)
  const [pending, start] = useTransition()
  return (
    <fieldset className="space-y-2" aria-describedby="dm-help">
      <legend className="h-section">Who can message me</legend>
      <p id="dm-help" className="text-sm text-muted-foreground">Applies to new direct messages{pending ? " · saving..." : ""}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(([value, label, hint]) => (
          <label key={value} className={cn("cursor-pointer rounded-xl border p-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/50", policy === value ? "border-leaf bg-leaf-soft" : "hover:bg-muted/50")}>
            <input type="radio" name="message_policy" value={value} checked={policy === value} className="sr-only"
              onChange={() => { setPolicy(value); start(() => setMessagePolicy(value)) }} />
            <span className={cn("block font-semibold", policy === value && "text-leaf")}>{label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
