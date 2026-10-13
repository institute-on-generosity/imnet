import type { ImpactStat } from "@/lib/types"

// Number each distinct source once, like footnotes, so every figure points to where it came from.
// marks[i] is the footnote number for stats[i]; sources[n - 1] is footnote n.
export function footnotes(stats: Pick<ImpactStat, "source_url" | "as_of">[]) {
  const sources: { url: string; asOf: string | null }[] = []
  const index = new Map<string, number>()
  const marks = stats.map((s) => {
    if (!index.has(s.source_url)) {
      sources.push({ url: s.source_url, asOf: s.as_of })
      index.set(s.source_url, sources.length)
    }
    return index.get(s.source_url)!
  })
  return { sources, marks }
}
