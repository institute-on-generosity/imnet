"use client"

import { HeartHandshake, Send } from "lucide-react"
import { useActionState, useState } from "react"
import { sendThanks } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

// A private note to the org's team. No public count, no reply thread.
export function ThanksButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(sendThanks.bind(null, orgId), null)
  return (
    <>
      <IconTip label="Send a thank-you note">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full border transition-colors",
            open ? "border-leaf bg-leaf-soft text-leaf" : "border-border bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          <HeartHandshake className="size-4" aria-hidden />
        </button>
      </IconTip>
      {open && (
        <div className="basis-full pt-2">
          {state?.ok ? (
            <p role="status" className="text-sm text-leaf">{state.message}</p>
          ) : (
            <form action={action} className="space-y-2">
              <label htmlFor="thanks-body" className="text-sm font-semibold">Thank {orgName}&apos;s team</label>
              <Textarea id="thanks-body" name="body" rows={3} maxLength={500} required autoFocus defaultValue={state?.values?.body} placeholder="What their work meant to you. Only their team sees it." />
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={pending}><Send aria-hidden />{pending ? "Sending..." : "Send note"}</Button>
                {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
