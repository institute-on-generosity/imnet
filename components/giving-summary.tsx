import { HandHeart } from "lucide-react"
import Link from "@/components/intent-link"
import { formatUsd } from "@/lib/grants"
import type { GivingSummary } from "@/lib/queries"
import { Panel } from "./shell"

const sinceLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })

// Opted-in totals from the giving journal: how much, to how many organizations, and by cause.
// Self-reported; individual gifts stay private.
export function GivingSummaryPanel({ summary, isOwn }: { summary: GivingSummary; isOwn: boolean }) {
  const max = Math.max(...summary.causes.map((c) => c.amount))
  return (
    <Panel aria-labelledby="giving-totals" className="p-4 sm:p-6">
      <h2 id="giving-totals" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
        <HandHeart className="size-5 text-marigold" aria-hidden />{isOwn ? "My giving" : "Giving"}
      </h2>
      <p className="mt-3 font-heading text-4xl font-semibold tabular-nums">{formatUsd(summary.total)}</p>
      <p className="text-sm text-muted-foreground">
        given to {summary.orgs} {summary.orgs === 1 ? "organization" : "organizations"} since {sinceLabel(summary.since)}
      </p>
      <h3 className="mt-5 text-sm font-semibold">By cause</h3>
      <ul className="mt-2 space-y-2.5">
        {summary.causes.map((c) => (
          <li key={c.slug}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <Link href={`/?cause=${c.slug}`} className="hover:underline">{c.name}</Link>
              <span className="tabular-nums text-muted-foreground">{formatUsd(c.amount)} · {Math.round((c.amount / summary.total) * 100)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.max(4, (c.amount / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Self-reported in {isOwn ? "my" : "their"} giving journal. Gifts to organizations with several causes are split evenly. Individual gifts stay private.
        {isOwn && <> <Link href="/giving#giving-totals-toggle" className="text-leaf hover:underline">Change what&apos;s shown</Link></>}
      </p>
    </Panel>
  )
}
