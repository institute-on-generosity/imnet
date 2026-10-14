import { HandHeart } from "lucide-react"
import Link from "@/components/intent-link"
import { formatUsd } from "@/lib/grants"
import type { GivingSummary } from "@/lib/queries"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { Panel } from "./shell"

const sinceLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })

// Opted-in totals from the giving journal: how much, to which organizations, and the causes those
// organizations work on. No per-cause amounts: a gift to a two-cause org isn't half to each (B-028).
// Self-reported; individual gifts stay private.
export function GivingSummaryPanel({ summary, isOwn }: { summary: GivingSummary; isOwn: boolean }) {
  return (
    <Panel aria-labelledby="giving-totals" className="p-4 sm:p-6">
      <h2 id="giving-totals" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
        <HandHeart className="size-5 text-marigold" aria-hidden />{isOwn ? "My giving" : "Giving"}
      </h2>
      <p className="mt-3 font-heading text-4xl font-semibold tabular-nums">{formatUsd(summary.total)}</p>
      <p className="text-sm text-muted-foreground">
        given to {summary.orgs} {summary.orgs === 1 ? "organization" : "organizations"} since {sinceLabel(summary.since)}
      </p>
      <h3 className="mt-5 text-sm font-semibold">By organization</h3>
      <ul className="mt-2 divide-y border-y">
        {summary.byOrg.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <OrgMark org={o} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5">
                <Link href={`/o/${o.slug}`} className="truncate text-sm font-medium hover:underline">{o.name}</Link>
                {o.org_type === "foundation" && <FoundationMark />}
              </p>
              {o.causes.length > 0 && <p className="truncate text-xs text-muted-foreground">{o.causes.join(", ")}</p>}
            </div>
            <span className="text-sm tabular-nums">{formatUsd(o.amount)}</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-sm font-semibold">Causes supported</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {summary.causes.map((c) => (
          <li key={c.slug}><Link href={`/?cause=${c.slug}`} className="rounded-full border px-2.5 py-0.5 text-sm hover:bg-muted">{c.name}</Link></li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Self-reported in {isOwn ? "my" : "their"} giving journal. Individual gifts and dates stay private.
        {isOwn && <> <Link href="/giving#giving-totals-toggle" className="text-leaf hover:underline">Change what&apos;s shown</Link></>}
      </p>
    </Panel>
  )
}
