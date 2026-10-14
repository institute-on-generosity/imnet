import { Check, X } from "lucide-react"
import { confirmGrant, declineGrant } from "@/app/actions"
import { OrgMark } from "@/components/org-mark"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatUsd } from "@/lib/grants"
import type { Grant } from "@/lib/types"

// A grant only appears publicly once the nonprofit says it's real.
export function GrantsToConfirm({ orgId, grants }: { orgId: string; grants: Grant[] }) {
  if (grants.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle>Grants to confirm</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Confirmed grants show on both profiles.</p>
        {grants.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <OrgMark org={g.foundation} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{g.foundation.name}</p>
              <p className="text-muted-foreground">{[g.amount_usd && formatUsd(g.amount_usd), g.purpose].filter(Boolean).join(", ") || "No amount listed"}</p>
            </div>
            <form action={confirmGrant.bind(null, g.id, orgId)}><Button type="submit" size="sm"><Check aria-hidden />Confirm</Button></form>
            <form action={declineGrant.bind(null, g.id, orgId)}><Button type="submit" size="sm" variant="outline"><X aria-hidden />Not ours</Button></form>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
