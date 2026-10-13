"use client"

import { X } from "lucide-react"
import { useState, useTransition } from "react"
import { searchGrantees } from "@/app/actions"
import { OrgMark } from "@/components/org-mark"
import { Input } from "@/components/ui/input"
import { MAX_GRANTS_PER_POST } from "@/lib/grants"
import type { OrgSummary } from "@/lib/types"

type Tagged = OrgSummary & { amount: string; purpose: string }

// Foundations tag the nonprofits a post is about. Each grant waits for the nonprofit to confirm.
export function GranteePicker() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OrgSummary[]>([])
  const [tagged, setTagged] = useState<Tagged[]>([])
  const [, startSearch] = useTransition()

  function search(q: string) {
    setQuery(q)
    startSearch(async () => setResults(q.trim().length >= 2 ? await searchGrantees(q) : []))
  }
  const update = (i: number, patch: Partial<Tagged>) => setTagged((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  return (
    <div className="space-y-2">
      {tagged.map((t, i) => (
        <div key={t.id} className="space-y-2 rounded-lg border p-2">
          <input type="hidden" name="grantee_ids" value={t.id} />
          <div className="flex items-center gap-2">
            <OrgMark org={t} size="sm" />
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <button type="button" aria-label={`Remove ${t.name}`} onClick={() => setTagged((prev) => prev.filter((_, j) => j !== i))} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <Input name="grant_amounts" inputMode="numeric" placeholder="Amount (optional), e.g. 25000" aria-label={`Grant amount for ${t.name}`} value={t.amount} onChange={(e) => update(i, { amount: e.target.value })} className="w-56" />
            <Input name="grant_purposes" maxLength={200} placeholder="What it funds (optional)" aria-label={`Grant purpose for ${t.name}`} value={t.purpose} onChange={(e) => update(i, { purpose: e.target.value })} />
          </div>
        </div>
      ))}
      {tagged.length < MAX_GRANTS_PER_POST && (
        <div className="relative">
          <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Tag a grantee: type a nonprofit's name" aria-label="Search nonprofits to tag as grantees" />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-card shadow-md">
              {results
                .filter((r) => !tagged.some((t) => t.id === r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTagged((prev) => [...prev, { ...r, amount: "", purpose: "" }])
                        setQuery("")
                        setResults([])
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <OrgMark org={r} size="sm" />
                      {r.name}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
