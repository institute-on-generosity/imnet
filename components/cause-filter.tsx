import Link from "@/components/intent-link"
import { feedHref, type FeedType } from "@/lib/feed-href"
import { cn } from "@/lib/utils"
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
    <nav aria-label="Filter by cause" className="overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max gap-1.5">
        <Link href={href()} className={pill(!active)} aria-current={!active ? "page" : undefined}>All causes</Link>
        {/* The selected cause comes first so it's never scrolled out of view. */}
        {[...causes].sort((a, b) => Number(b.slug === active) - Number(a.slug === active)).map((c) => (
          <Link key={c.slug} href={href(c.slug)} className={pill(active === c.slug)} aria-current={active === c.slug ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
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
    <nav aria-label="Filter by who's posting" className="inline-flex shrink-0 rounded-full bg-muted p-1 text-sm">
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
