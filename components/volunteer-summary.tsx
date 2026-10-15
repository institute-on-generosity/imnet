import { BadgeCheck, Clock } from "lucide-react"
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
      {summary.confirmed > 0 && (
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-leaf"><BadgeCheck className="size-4" aria-hidden />{hoursLabel(summary.confirmed)} confirmed by the organizations</p>
      )}
      <ul className="mt-4 divide-y border-y">
        {summary.byOrg.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <OrgMark org={o} size="sm" />
            <Link href={`/o/${o.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{o.name}</Link>
            {o.org_type === "foundation" && <FoundationMark />}
            <span className="text-right text-sm">
              {hoursLabel(o.hours)}
              {o.confirmed > 0 && (
                <span className="flex items-center justify-end gap-1 text-xs text-leaf" title="Confirmed by the organization">
                  <BadgeCheck className="size-3.5" aria-hidden />{o.confirmed === o.hours ? "Confirmed" : `${hoursLabel(o.confirmed)} confirmed`}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Logged in {isOwn ? "my" : "their"} journal; a check means the organization confirmed it. Days and notes stay private.
        {isOwn && <> <Link href="/giving#volunteer-hours-toggle" className="text-leaf hover:underline">Change what&apos;s shown</Link></>}
      </p>
    </Panel>
  )
}
