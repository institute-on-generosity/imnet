"use client"

import { Dialog } from "@base-ui/react/dialog"
import { MessageSquareHeart, X } from "lucide-react"
import { useActionState, useState } from "react"
import { saveExperience } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const KINDS = [
  ["volunteered", "I volunteered"],
  ["gave", "I gave"],
  ["attended", "I went to an event"],
] as const

// F-111: share how it went, with the people who follow you (never public, never counted).
export function ExperienceForm({ orgId, slug, orgName }: { orgId: string; slug: string; orgName: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(async (prev: { error?: string; ok?: boolean } | null, form: FormData) => {
    const r = await saveExperience(orgId, slug, prev, form)
    if (r.ok) setOpen(false)
    return r
  }, null)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-transform hover:bg-muted active:scale-95">Share</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" style={{ backgroundColor: "rgb(20 33 61 / 0.4)" }} />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card p-5 shadow-xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-leaf-soft text-leaf"><MessageSquareHeart className="size-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="h-section">How was {orgName}?</Dialog.Title>
              <Dialog.Description className="text-xs text-faint">Only people who follow you see this</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden /></Dialog.Close>
          </div>
          <form action={action} className="mt-4 space-y-3">
            <fieldset>
              <legend className="sr-only">What did you do?</legend>
              <div className="flex flex-wrap gap-2">
                {KINDS.map(([value, label], i) => (
                  <label key={value} className="cursor-pointer rounded-full border px-3 py-1 text-sm has-checked:border-leaf has-checked:bg-leaf-soft has-checked:font-semibold has-checked:text-leaf has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
                    <input type="radio" name="kind" value={value} defaultChecked={i === 0} className="sr-only" />{label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="sr-only">A few words (optional)</span>
              <textarea name="note" rows={3} maxLength={280} placeholder="What was it like? Would you go back?"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
            </label>
            {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            <button type="submit" disabled={pending} className={cn(buttonVariants(), "w-full")}>{pending ? "Sharing..." : "Share with my followers"}</button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
