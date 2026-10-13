import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Cause } from "@/lib/types"

// Horizontal pill row; scrolls sideways on phones instead of wrapping into a wall.
export function CauseFilter({ causes, active, basePath }: { causes: Cause[]; active?: string; basePath: string }) {
  const pill = (on: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
    )
  return (
    <nav aria-label="Filter by cause" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <div className="flex w-max gap-2 pb-1">
        <Link href={basePath} className={pill(!active)} aria-current={!active ? "page" : undefined}>All causes</Link>
        {causes.map((c) => (
          <Link key={c.slug} href={`${basePath}?cause=${c.slug}`} className={pill(active === c.slug)} aria-current={active === c.slug ? "page" : undefined}>
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
