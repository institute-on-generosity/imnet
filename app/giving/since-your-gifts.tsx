import Link from "@/components/intent-link"
import { OrgMark } from "@/components/org-mark"
import { Panel } from "@/components/shell"
import type { OrgSummary } from "@/lib/types"

type Item = { id: string; body: string; created_at: string; org: OrgSummary }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// What the orgs you gave to have shared since your first gift to each.
export function SinceYourGifts({ posts }: { posts: Item[] }) {
  if (posts.length === 0) return null
  return (
    <Panel aria-labelledby="since" className="p-4">
      <h2 id="since" className="h-section">Since your gifts</h2>
      <p className="text-sm text-muted-foreground">News from organizations you gave to.</p>
      <ul className="mt-2 divide-y">
        {posts.map((p) => (
          <li key={p.id} className="flex gap-3 py-2.5">
            <OrgMark org={p.org} size="sm" />
            <Link href={`/p/${p.id}`} className="min-w-0 flex-1 text-sm hover:underline">
              <span className="font-semibold">{p.org.name}</span>
              <span className="text-muted-foreground">, {day(p.created_at)}: </span>
              <span className="line-clamp-2">{p.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
