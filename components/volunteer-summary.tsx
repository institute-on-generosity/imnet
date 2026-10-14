import { Clock } from "lucide-react"
import Link from "@/components/intent-link"
import type { VolunteerSummary } from "@/lib/queries"
import { hoursLabel } from "@/lib/volunteer"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { Panel } from "./shell"

const sinceLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })

// Opted-in volunteer hours (F-081): total and hours at each organization. Self-reported.
export function VolunteerSummaryPanel({ summary, isOwn }: { summary: VolunteerSummary; isOwn: boolean }) {
  return (
    <Panel aria-labelledby="volunteering" className="p-4 sm:p-6">
      <h2 id="volunteering" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
        <Clock className="size-5 text-leaf" aria-hidden />Volunteering
      </h2>
      <p className="mt-3 font-heading text-4xl font-semibold">{hoursLabel(summary.total)}</p>
      <p className="text-sm text-muted-foreground">
        with {summary.byOrg.length} {summary.byOrg.length === 1 ? "organization" : "organizations"} since {sinceLabel(summary.since)}
      </p>
      <ul className="mt-4 divide-y border-y">
        {summary.byOrg.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <OrgMark org={o} size="sm" />
            <Link href={`/o/${o.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{o.name}</Link>
            {o.org_type === "foundation" && <FoundationMark />}
            <span className="text-sm">{hoursLabel(o.hours)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Self-reported in {isOwn ? "my" : "their"} journal. Days and notes stay private.
        {isOwn && <> <Link href="/giving#volunteer-hours-toggle" className="text-leaf hover:underline">Change what&apos;s shown</Link></>}
      </p>
    </Panel>
  )
}
