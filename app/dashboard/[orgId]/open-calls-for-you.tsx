import Link from "@/components/intent-link"
import { OrgMark } from "@/components/org-mark"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatUsd } from "@/lib/grants"
import { formatDeadline } from "@/lib/open-calls"
import type { Post } from "@/lib/types"

// Calls from foundations that match this nonprofit's causes.
export function OpenCallsForYou({ calls }: { calls: Post[] }) {
  if (calls.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle>Open calls for your causes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {calls.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <OrgMark org={c.org} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.org.name}</p>
              <p className="line-clamp-2 text-muted-foreground">{c.body}</p>
              <p className="mt-1">
                Apply by {formatDeadline(c.call_deadline!)}
                {c.call_max_award ? `, up to ${formatUsd(c.call_max_award)}` : ""}
              </p>
            </div>
            <Link href={`/p/${c.id}`} className="shrink-0 text-sm font-medium text-leaf hover:underline">Details</Link>
          </div>
        ))}
        <Link href="/calls" className="inline-block text-sm font-medium text-muted-foreground hover:text-leaf hover:underline">See all open calls</Link>
      </CardContent>
    </Card>
  )
}
