"use client"

import { Link2, Plus, Trash2 } from "lucide-react"
import { useActionState } from "react"
import { addImpactStat, deleteImpactStat } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ImpactStat } from "@/lib/types"

// Staff add the numbers on their profile. No source, no stat (design principle #1).
export function ImpactStatsEditor({ orgId, stats }: { orgId: string; stats: ImpactStat[] }) {
  const [state, action, pending] = useActionState(addImpactStat.bind(null, orgId), null)
  const v = state?.values
  return (
    <div className="space-y-4">
      {stats.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {stats.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-heading text-lg font-semibold tabular-nums">{s.value}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
              <IconTip label={`Source: ${s.source_url}`}>
                <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <Link2 className="size-4" aria-hidden />
                </a>
              </IconTip>
              <form action={deleteImpactStat.bind(null, s.id)}>
                <IconTip label={`Remove "${s.label}"`}>
                  <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </IconTip>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form key={state?.id ?? "new"} action={action} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="stat-value">Figure</Label>
          <Input id="stat-value" name="value" required maxLength={30} placeholder="48,200" defaultValue={v?.value} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stat-label">What it counts</Label>
          <Input id="stat-label" name="label" required maxLength={80} placeholder="Meals served" defaultValue={v?.label} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="stat-source">Source link (required)</Label>
          <Input id="stat-source" name="source_url" type="url" required placeholder="https://your-org.org/annual-report" defaultValue={v?.source_url} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stat-asof">As of (optional)</Label>
          <Input id="stat-asof" name="as_of" type="date" defaultValue={v?.as_of} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}><Plus aria-hidden />{pending ? "Adding..." : "Add figure"}</Button>
        </div>
        {state?.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
      </form>
    </div>
  )
}
