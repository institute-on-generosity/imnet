"use client"

import { Plus, Trash2 } from "lucide-react"
import { useActionState } from "react"
import { addGift, deleteGift } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function GiftForm({ orgs, today, preselect }: { orgs: { id: string; name: string }[]; today: string; preselect?: string }) {
  const [state, action, pending] = useActionState(addGift, null)
  const v = state?.values
  return (
    <form key={state?.id ?? "new"} action={action} className="grid gap-3 sm:grid-cols-[1fr_8rem_10rem]">
      <div className="space-y-1">
        <Label htmlFor="gift-org">Organization</Label>
        <select id="gift-org" name="org_id" required defaultValue={v?.org_id ?? preselect ?? ""} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
          <option value="" disabled>Choose...</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="gift-amount">Amount ($)</Label>
        <Input id="gift-amount" name="amount" inputMode="numeric" required placeholder="50" defaultValue={v?.amount} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gift-date">Date</Label>
        <Input id="gift-date" name="given_on" type="date" required max={today} defaultValue={v?.given_on ?? today} />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="gift-note">Note (optional)</Label>
        <Input id="gift-note" name="note" maxLength={300} placeholder="Year-end gift, receipt in email" defaultValue={v?.note} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}><Plus aria-hidden />{pending ? "Logging..." : "Log gift"}</Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}

export function DeleteGift({ id, label }: { id: string; label: string }) {
  return (
    <form action={deleteGift.bind(null, id)}>
      <IconTip label={`Remove ${label}`}>
        <button type="submit" className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </IconTip>
    </form>
  )
}
