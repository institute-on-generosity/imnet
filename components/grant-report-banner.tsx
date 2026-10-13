import { Landmark } from "lucide-react"
import Link from "next/link"
import { formatUsd } from "@/lib/grants"
import type { ReportGrant } from "@/lib/types"

// Marks a nonprofit's post as its report on a foundation's (confirmed) grant.
export function GrantReportBanner({ grant }: { grant: ReportGrant }) {
  const detail = [grant.amount_usd && formatUsd(grant.amount_usd), grant.purpose && `for ${grant.purpose.charAt(0).toLowerCase()}${grant.purpose.slice(1)}`]
    .filter(Boolean)
    .join(" ")
  return (
    <Link
      href={`/o/${grant.foundation.slug}`}
      className="mx-4 mt-3 flex items-start gap-2.5 rounded-lg bg-primary/5 px-3 py-2 text-sm hover:bg-primary/10"
    >
      <Landmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="block">
          <span className="font-medium">Grant report</span>
          <span className="text-muted-foreground"> for {grant.foundation.name}</span>
        </span>
        {detail && <span className="block text-muted-foreground">{detail.charAt(0).toUpperCase() + detail.slice(1)}</span>}
      </span>
    </Link>
  )
}
