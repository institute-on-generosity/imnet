import Link from "next/link"
import { OrgMark } from "@/components/org-mark"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { awardedAgo, formatUsd } from "@/lib/grants"
import type { Grant } from "@/lib/types"


// For foundations: confirmed grants with no report yet, oldest first. A view, not a nag: imnet never chases grantees.
export function GrantsAwaitingReport({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle>Reports not yet posted</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Confirmed grants without a grant report, oldest first.</p>
        {grants.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-lg border p-3">
            <OrgMark org={g.grantee} />
            <div className="min-w-0 flex-1 text-sm">
              <Link href={`/o/${g.grantee.slug}`} className="font-medium hover:underline">{g.grantee.name}</Link>
              <p className="text-muted-foreground">{[g.amount_usd && formatUsd(g.amount_usd), g.purpose].filter(Boolean).join(", ")}</p>
            </div>
            <span className="shrink-0 text-sm text-muted-foreground">Awarded {awardedAgo(g.awarded_on, new Date().toISOString().slice(0, 10))}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
