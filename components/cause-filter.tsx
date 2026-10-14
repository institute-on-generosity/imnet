import Link from "next/link"
import { feedHref } from "@/lib/feed-href"
import { cn } from "@/lib/utils"
import type { Cause, OrgType } from "@/lib/types"

const pill = (on: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
  )

// Horizontal pill row; scrolls sideways on phones instead of wrapping into a wall.
export function CauseFilter({ causes, active, type, basePath }: { causes: Cause[]; active?: string; type?: OrgType; basePath: string }) {
  return (
    <nav aria-label="Filter by cause" className="overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max gap-1.5">
        <Link href={feedHref(basePath, { type })} className={pill(!active)} aria-current={!active ? "page" : undefined}>All causes</Link>
        {causes.map((c) => (
          <Link key={c.slug} href={feedHref(basePath, { cause: c.slug, type })} className={pill(active === c.slug)} aria-current={active === c.slug ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}

// Segmented control: who's posting.
export function OrgTypeFilter({ active, cause, basePath }: { active?: OrgType; cause?: string; basePath: string }) {
  const options: { type?: OrgType; label: string }[] = [
    { label: "All" },
    { type: "nonprofit", label: "Nonprofits" },
    { type: "foundation", label: "Foundations" },
  ]
  return (
    <nav aria-label="Filter by organization type" className="inline-flex shrink-0 rounded-full bg-muted p-1 text-sm">
      {options.map((o) => {
        const on = active === o.type
        return (
          <Link
            key={o.label}
            href={feedHref(basePath, { cause, type: o.type })}
            aria-current={on ? "page" : undefined}
            className={cn("rounded-full px-3 py-1 transition-colors", on ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </Link>
        )
      })}
    </nav>
  )
}
