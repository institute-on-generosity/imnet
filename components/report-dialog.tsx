"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Flag, X } from "lucide-react"
import { useActionState } from "react"
import { reportPerson } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const REASONS = ["Spam or scam", "Harassment or hate", "Pretending to be someone else", "Something else"]

// F-125: report a person for review. From a conversation, their recent messages go with it.
export function ReportDialog({ profileId, name, conversationId, className }: { profileId: string; name: string; conversationId?: string; className?: string }) {
  const [state, action, pending] = useActionState(reportPerson.bind(null, profileId, conversationId ?? null), null)
  return (
    <Dialog.Root>
      <Dialog.Trigger aria-label={`Report ${name}`} title="Report" className={cn("grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground", className)}>
        <Flag className="size-4" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" style={{ backgroundColor: "rgb(20 33 61 / 0.4)" }} />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card p-5 shadow-xl outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="h-section">Report {name}</Dialog.Title>
              <Dialog.Description className="text-xs text-faint">
                {conversationId ? "Our team reviews it with their last few messages. They aren't told who reported" : "Our team reviews it. They aren't told who reported"}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden /></Dialog.Close>
          </div>
          {state?.ok ? (
            <div className="mt-4 space-y-3">
              <p role="status" className="text-sm">Thanks. We&apos;ll review it.</p>
              <Dialog.Close className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Done</Dialog.Close>
            </div>
          ) : (
            <form action={action} className="mt-4 space-y-3">
              <fieldset className="space-y-2">
                <legend className="sr-only">What&apos;s wrong?</legend>
                {REASONS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm has-checked:border-leaf has-checked:bg-leaf-soft has-checked:font-semibold has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
                    <input type="radio" name="reason" value={r} required className="accent-leaf" />{r}
                  </label>
                ))}
              </fieldset>
              <label className="block">
                <span className="sr-only">Anything else we should know (optional)</span>
                <textarea name="details" rows={2} maxLength={800} placeholder="Anything else we should know (optional)"
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              </label>
              {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
              <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "destructive" }), "w-full")}>{pending ? "Sending..." : "Send report"}</button>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
