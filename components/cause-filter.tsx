import Link from "@/components/intent-link"
import { feedHref, type FeedType } from "@/lib/feed-href"
import { cn } from "@/lib/utils"
import { ChipRow } from "./chip-row"
import type { Cause } from "@/lib/types"

const pill = (on: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
  )

// Horizontal pill row; scrolls sideways on phones instead of wrapping into a wall.
// hrefFor: build links yourself (pages with extra filters); otherwise feed links on basePath.
export function CauseFilter({ causes, active, type, basePath, hrefFor }: { causes: Cause[]; active?: string; type?: FeedType; basePath: string; hrefFor?: (cause?: string) => string }) {
  const href = (cause?: string) => (hrefFor ? hrefFor(cause) : feedHref(basePath, { cause, type }))
  return (
    <ChipRow label="Filter by cause">
        <Link href={href()} className={pill(!active)} aria-current={!active ? "page" : undefined}>All causes</Link>
        {causes.map((c) => (
          <Link key={c.slug} href={href(c.slug)} className={pill(active === c.slug)} aria-current={active === c.slug ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
    </ChipRow>
  )
}

// Segmented control: who's posting.
export function OrgTypeFilter({ active, cause, basePath, donors = true }: { active?: FeedType; cause?: string; basePath: string; donors?: boolean }) {
  const options: { type?: FeedType; label: string }[] = [
    { label: "All" },
    { type: "nonprofit", label: "Nonprofits" },
    { type: "foundation", label: "Foundations" },
    ...(donors ? [{ type: "donor" as const, label: "Donors" }] : []),
  ]
  return (
    <nav aria-label="Filter by who's posting" className="inline-flex max-w-full shrink-0 overflow-x-auto rounded-full bg-muted p-1 text-sm [scrollbar-width:none]">
      {options.map((o) => {
        const on = active === o.type
        return (
          <Link
            key={o.label}
            href={feedHref(basePath, { cause, type: o.type })}
            aria-current={on ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-2.5 py-1 transition-colors sm:px-3", on ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </Link>
        )
      })}
    </nav>
  )
}
