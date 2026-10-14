import { PenLine } from "lucide-react"
import Link from "next/link"
import { OrgMark } from "@/components/org-mark"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatUsd } from "@/lib/grants"
import type { Grant } from "@/lib/types"

// Nudge, not nag: confirmed grants without a report yet. One click opens the composer on that grant.
export function GrantsNeedingReport({ orgId, grants }: { orgId: string; grants: Grant[] }) {
  if (grants.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle>Share how your grants are going</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">A short post is enough.</p>
        {grants.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <OrgMark org={g.foundation} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{g.foundation.name}</p>
              <p className="text-muted-foreground">{[g.amount_usd && formatUsd(g.amount_usd), g.purpose].filter(Boolean).join(", ")}</p>
            </div>
            <Link href={`/dashboard/${orgId}?report=${g.id}#composer`} className={buttonVariants({ size: "sm" })}><PenLine aria-hidden />Write a report</Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
