import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatUsd } from "@/lib/grants"
import type { Grant } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OrgMark } from "./org-mark"

// Grantees tagged on a foundation's post. Unconfirmed grants are only visible to the two orgs' staff.
export function GrantChips({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) return null
  return (
    <div className="mt-3 space-y-1.5 px-4">
      <p className="text-xs font-medium text-muted-foreground">Grants in this post</p>
      <ul className="divide-y rounded-lg border">
        {grants.map((g) => (
          <li key={g.id}>
            <Link
              href={`/o/${g.grantee.slug}`}
              className={cn("flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted", !g.confirmed_at && "bg-muted/40")}
            >
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <OrgMark org={g.grantee} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{g.grantee.name}</span>
                {g.purpose && <span className="text-muted-foreground"> for {g.purpose.charAt(0).toLowerCase() + g.purpose.slice(1)}</span>}
              </span>
              {!g.confirmed_at && <span className="shrink-0 text-xs text-muted-foreground">Awaiting confirmation</span>}
              {g.reports.length > 0 && <span className="shrink-0 rounded-full bg-leaf-soft px-2 py-0.5 text-xs text-leaf">Report posted</span>}
              {g.amount_usd && <span className="shrink-0 font-medium tabular-nums">{formatUsd(g.amount_usd)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
