import { Landmark } from "lucide-react"
import Link from "@/components/intent-link"
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
      className="group mx-4 mt-3 flex items-start gap-2 text-[13px] leading-snug"
    >
      <Landmark className="mt-px size-4 shrink-0 text-primary/70" aria-hidden />
      <span className="min-w-0">
        <span className="block">
          <span className="font-semibold">Grant report</span>
          <span className="text-muted-foreground"> for <span className="group-hover:underline">{grant.foundation.name}</span></span>
        </span>
        {detail && <span className="block text-faint">{detail.charAt(0).toUpperCase() + detail.slice(1)}</span>}
      </span>
    </Link>
  )
}
