"use client"

import { Clock, Trash2 } from "lucide-react"
import { useActionState } from "react"
import { addHours, deleteHours } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Log a volunteer shift (F-081): organization, day, hours, optional note.
export function HoursForm({ orgs, today }: { orgs: { id: string; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(addHours, null)
  const v = state?.values
  return (
    <form key={state?.id ?? "new"} action={action} className="grid gap-3 sm:grid-cols-[1fr_7rem_10rem]">
      <div className="space-y-1">
        <Label htmlFor="hours-org">Organization</Label>
        <select id="hours-org" name="org_id" required defaultValue={v?.org_id ?? ""} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
          <option value="" disabled>Choose...</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hours-hours">Hours</Label>
        <Input id="hours-hours" name="hours" inputMode="decimal" required placeholder="3" defaultValue={v?.hours} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hours-date">Day</Label>
        <Input id="hours-date" name="served_on" type="date" required max={today} defaultValue={v?.served_on ?? today} />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="hours-note">Note (optional)</Label>
        <Input id="hours-note" name="note" maxLength={300} placeholder="Saturday dinner crew" defaultValue={v?.note} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}><Clock aria-hidden />{pending ? "Logging..." : "Log hours"}</Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}

export function DeleteHours({ id, label }: { id: string; label: string }) {
  return (
    <form action={deleteHours.bind(null, id)}>
      <IconTip label={`Remove ${label}`}>
        <button type="submit" className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </IconTip>
    </form>
  )
}
