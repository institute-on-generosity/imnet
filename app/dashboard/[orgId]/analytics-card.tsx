import Link from "@/components/intent-link"
import { total, type Series } from "@/lib/analytics"
import type { TopPost } from "@/lib/queries"

const METRICS = [
  { key: "view", label: "Views", color: "var(--leaf)" },
  { key: "share", label: "Shares", color: "var(--primary)" },
  { key: "donate_click", label: "Donate clicks", color: "var(--marigold)" },
] as const

const short = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

// Private to the org's team: 30 days of views, shares and donate clicks, and the posts people read most.
export function AnalyticsCard({ series, top }: { series: Series; top: TopPost[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {METRICS.map((m) => (
          <figure key={m.key} className="rounded-lg border p-3">
            <figcaption className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <span className="text-xl font-semibold tabular-nums">{total(series, m.key).toLocaleString("en-US")}</span>
            </figcaption>
            <Bars series={series} metric={m.key} color={m.color} label={m.label} />
          </figure>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-semibold">Most viewed posts</h3>
        {top.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">Post</th>
                  {["Views", "Shares", "Moved", "Saves", "Comments"].map((h) => <th key={h} className="px-2 py-1 text-right font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {top.map((p) => (
                  <tr key={p.post_id}>
                    <td className="max-w-0 py-2 pr-3"><Link href={`/p/${p.post_id}`} className="block truncate hover:underline">{p.body}</Link></td>
                    {[p.views, p.shares, p.moved, p.saves, p.comments].map((n, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{n.toLocaleString("en-US")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Only your team sees these numbers. Views and shares are the last 30 days; moved, saves and comments are all time.</p>
    </div>
  )
}

function Bars({ series, metric, color, label }: { series: Series; metric: "view" | "share" | "donate_click"; color: string; label: string }) {
  const max = Math.max(1, ...series.map((d) => d[metric]))
  const w = 100 / series.length
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-16 w-full" role="img" aria-label={`${label} per day, ${short(series[0].day)} to ${short(series.at(-1)!.day)}`}>
      {series.map((d, i) => {
        const h = (d[metric] / max) * 38
        return (
          <rect key={d.day} x={i * w + w * 0.15} y={40 - h} width={w * 0.7} height={Math.max(h, 0.5)} fill={color} opacity={d[metric] ? 0.85 : 0.2}>
            <title>{`${short(d.day)}: ${d[metric]}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}
