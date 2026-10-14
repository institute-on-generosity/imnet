import Link from "@/components/intent-link"
import { formatUsd, grantTotals } from "@/lib/grants"
import type { Grant, OrgSummary } from "@/lib/types"
import { latest, LatestReport } from "./grants-panel"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"

// On a donor's profile: for each fund they say they give through, the fund's confirmed grants
// and what grantees reported. Pooled money, so this is the fund's record, not a trace of one gift.
export function GivingBecame({ funds, isOwn }: { funds: { foundation: OrgSummary; grants: Grant[] }[]; isOwn: boolean }) {
  if (funds.length === 0) return null
  return (
    <Panel className="p-4 sm:p-6">
      <h2 className="font-sans text-lg font-semibold tracking-normal">What {isOwn ? "my" : "their"} giving became</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirmed grants from funds {isOwn ? "I give" : "they give"} through. Pooled: the fund&apos;s record, not one gift.
      </p>
      <div className="mt-4 space-y-5">
        {funds.map(({ foundation, grants }) => {
          const { count, total } = grantTotals(grants, "grantee")
          return (
            <section key={foundation.id} aria-label={`Grants from ${foundation.name}`}>
              <div className="flex items-center gap-3">
                <OrgMark org={foundation} />
                <div className="min-w-0">
                  <Link href={`/o/${foundation.slug}`} className="font-medium hover:underline">{foundation.name}</Link>
                  <p className="text-sm text-muted-foreground">
                    {grants.length ? `${total ? `${formatUsd(total)} to ` : ""}${count} ${count === 1 ? "nonprofit" : "nonprofits"}` : "No confirmed grants yet"}
                  </p>
                </div>
              </div>
              {grants.length > 0 && (
                <ul className="mt-2 space-y-2 border-l-2 pl-4 ml-6">
                  {grants.map((g) => (
                    <li key={g.id} className="text-sm">
                      <Link href={`/o/${g.grantee.slug}`} className="font-medium hover:underline">{g.grantee.name}</Link>
                      <span className="text-muted-foreground">
                        {" "}{[g.amount_usd && formatUsd(g.amount_usd), g.purpose].filter(Boolean).join(", ")}
                      </span>
                      {g.reports.length > 0 && <LatestReport report={latest(g.reports)} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </Panel>
  )
}
