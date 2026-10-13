import Link from "next/link"
import { formatUsd, grantTotals } from "@/lib/grants"
import type { Grant, Org } from "@/lib/types"
import { OrgMark } from "./org-mark"
import { OrgTypeBadge } from "./org-type-badge"
import { Panel } from "./shell"

const year = (d: string) => new Date(`${d}T00:00:00`).getFullYear()

// Nonprofit: "Funded by". Foundation: "Grantees". Confirmed grants only; totals are computed, not typed in.
export function GrantsPanel({ org, grants }: { org: Pick<Org, "org_type" | "name">; grants: Grant[] }) {
  const isFoundation = org.org_type === "foundation"
  if (grants.length === 0 && !isFoundation) return null
  const { count, total } = grantTotals(grants, isFoundation ? "grantee" : "foundation")

  return (
    <Panel className="p-4 sm:p-6">
      <h2 className="font-sans text-lg font-semibold tracking-normal">{isFoundation ? "Grantees" : "Funded by"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {grants.length === 0
          ? "No confirmed grants yet."
          : isFoundation
            ? `${total ? `${formatUsd(total)} to ` : ""}${count} ${count === 1 ? "nonprofit" : "nonprofits"}, each confirmed by the grantee`
            : `Grants from ${count} ${count === 1 ? "foundation" : "foundations"}, confirmed by ${org.name}`}
      </p>
      {grants.length > 0 && (
        <ul className="mt-3 divide-y border-y">
          {grants.map((g) => {
            const other = isFoundation ? g.grantee : g.foundation
            return (
              <li key={g.id} className="flex items-center gap-3 py-3">
                <OrgMark org={other} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/o/${other.slug}`} className="truncate font-medium hover:underline">{other.name}</Link>
                    <OrgTypeBadge type={other.org_type} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[g.amount_usd && formatUsd(g.amount_usd), g.purpose, year(g.awarded_on)].filter(Boolean).join(", ")}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
