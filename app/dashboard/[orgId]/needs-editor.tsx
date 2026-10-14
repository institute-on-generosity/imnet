"use client"

import { Check, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useActionState } from "react"
import { addNeed, deleteNeed, setNeedMet } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { PeopleList } from "@/components/people-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NEED_KIND_LABEL, NEED_KINDS, type Need } from "@/lib/needs"
import { cn } from "@/lib/utils"

const iconBtn = "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"

// Concrete asks on the profile. Mark them met when they are: met needs stay up for a month.
export function NeedsEditor({ orgId, needs, interest }: { orgId: string; needs: Need[]; interest: Record<string, { handle: string; display_name: string | null; avatar_url: string | null }[]> }) {
  const [state, action, pending] = useActionState(addNeed.bind(null, orgId), null)
  const v = state?.values
  return (
    <div className="space-y-4">
      {needs.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {needs.map((n) => (
            <li key={n.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{NEED_KIND_LABEL[n.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate", n.met_at && "text-muted-foreground line-through")}>{n.title}</p>
                {(interest[n.id]?.length ?? 0) > 0 && (
                  <details>
                    <summary className="cursor-pointer text-xs text-leaf">{interest[n.id].length} interested</summary>
                    <PeopleList people={interest[n.id]} />
                  </details>
                )}
              </div>
              <form action={setNeedMet.bind(null, n.id, !n.met_at)}>
                <IconTip label={n.met_at ? `Reopen "${n.title}"` : `Mark "${n.title}" met`}>
                  <button type="submit" className={cn(iconBtn, !n.met_at && "hover:text-leaf")}>
                    {n.met_at ? <RotateCcw className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
                  </button>
                </IconTip>
              </form>
              <form action={deleteNeed.bind(null, n.id)}>
                <IconTip label={`Remove "${n.title}"`}>
                  <button type="submit" className={cn(iconBtn, "hover:text-destructive")}><Trash2 className="size-4" aria-hidden /></button>
                </IconTip>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form key={state?.id ?? "new"} action={action} className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor="need-kind">Kind</Label>
          <select id="need-kind" name="kind" defaultValue={v?.kind ?? "item"} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            {NEED_KINDS.map((k) => <option key={k} value={k}>{NEED_KIND_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="need-title">What you need</Label>
          <Input id="need-title" name="title" required maxLength={120} placeholder="Winter coats, adult sizes" defaultValue={v?.title} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="need-detail">Details (optional)</Label>
          <Textarea id="need-detail" name="detail" rows={2} maxLength={500} placeholder="Drop off at 12 Pier St, weekdays 9 to 5." defaultValue={v?.detail} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="need-help">How to help: link or email</Label>
          <Input id="need-help" name="help_url" required placeholder="https://your-org.org/volunteer or help@your-org.org" defaultValue={v?.help_url} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}><Plus aria-hidden />{pending ? "Adding..." : "Add need"}</Button>
        </div>
        {state?.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
      </form>
    </div>
  )
}
