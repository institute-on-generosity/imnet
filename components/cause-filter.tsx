import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Cause } from "@/lib/types"

export function CauseFilter({ causes, active, basePath }: { causes: Cause[]; active?: string; basePath: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={basePath}><Badge variant={active ? "outline" : "default"}>All</Badge></Link>
      {causes.map((c) => (
        <Link key={c.slug} href={`${basePath}?cause=${c.slug}`}>
          <Badge variant={active === c.slug ? "default" : "outline"}>{c.name}</Badge>
        </Link>
      ))}
    </div>
  )
}
