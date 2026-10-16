import { BadgeCheck, CalendarDays, Globe, MapPin, Users } from "lucide-react"
import Link from "@/components/intent-link"
import { footnotes } from "@/lib/footnotes"
import type { ImpactStat, Org } from "@/lib/types"
import { Panel } from "./shell"

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "")

// Right-column cards: the proof next to the story. Compact, scannable, sourced.

export function RailHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h2 id={id} className="h-rail">{children}</h2>
}

// Impact figures, big, each footnoted to its source (no source, no stat).
export function ImpactCard({ stats, where = "rail" }: { stats: ImpactStat[]; where?: string }) {
  if (stats.length === 0) return null
  const { sources, marks } = footnotes(stats)
  return (
    <Panel aria-labelledby={`impact-${where}`} className="p-4">
      <RailHeading id={`impact-${where}`}>Impact so far</RailHeading>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
        {stats.slice(0, 4).map((s, i) => (
          <div key={s.id} className="min-w-0">
            <dd className="font-heading text-2xl leading-none font-semibold tabular-nums">
              {s.value}
              <sup className="ml-0.5 font-sans text-[10px] font-medium text-leaf">{marks[i]}</sup>
            </dd>
            <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
      <ol className="mt-3 space-y-0.5 border-t pt-2 text-[11px] text-faint">
        {sources.map((src, i) => (
          <li key={src.url} className="truncate">
            <span className="text-leaf">{i + 1}</span>{" "}
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{host(src.url)}</a>
            {src.asOf && `, ${new Date(`${src.asOf}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// LinkedIn-style "About" summary: verification, website, causes.
export function OrgFacts({ org, causes, irsVerified }: { org: Pick<Org, "website" | "slug" | "org_type" | "location" | "founded_year" | "team_size">; causes: { slug: string; name: string }[]; irsVerified?: boolean }) {
  return (
    <Panel className="space-y-2.5 p-4 text-sm">
      <p className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-leaf" aria-hidden />Verified {org.org_type}: {irsVerified ? "IRS records match; staff email checked" : "EIN and staff email checked"}</p>
      {org.website && (
        <p className="flex items-center gap-2">
          <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <a href={org.website} target="_blank" rel="noopener noreferrer" className="truncate text-leaf hover:underline">{host(org.website)}</a>
        </p>
      )}
      {org.location && <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />{org.location}</p>}
      {org.founded_year && <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />Founded {org.founded_year}</p>}
      {org.team_size && <p className="flex items-center gap-2"><Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />{org.team_size}</p>}
      {causes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {causes.map((c) => <li key={c.slug}><Link href={`/?cause=${c.slug}`} className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-secondary">{c.name}</Link></li>)}
        </ul>
      )}
    </Panel>
  )
}
