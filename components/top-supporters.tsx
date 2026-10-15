import Link from "@/components/intent-link"
import { formatUsd } from "@/lib/grants"
import type { Supporter } from "@/lib/queries"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { PersonAvatar } from "./person-avatar"
import { Panel } from "./shell"

// Who funds this nonprofit, largest first: foundations from confirmed grants, and people who
// chose to share their giving (self-reported). Nobody appears without consent.
export function TopSupporters({ supporters, where = "rail" }: { supporters: Supporter[]; where?: string }) {
  if (supporters.length === 0) return null
  const hasPeople = supporters.some((s) => s.kind === "person")
  return (
    <Panel aria-labelledby={`supporters-${where}`} className="p-4">
      <h2 id={`supporters-${where}`} className="h-rail">Top supporters</h2>
      <ul className="mt-3 space-y-2.5">
        {supporters.map((s) => (
          <li key={`${s.kind}-${s.id}`} className="flex items-center gap-2.5">
            {s.kind === "foundation" ? <OrgMark org={{ name: s.name, logo_url: s.logo_url, org_type: "foundation" }} size="sm" /> : <PersonAvatar name={s.name} avatarUrl={s.avatar_url} size="xs" className="size-6" />}
            <Link href={s.kind === "foundation" ? `/o/${s.slug}` : `/u/${s.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{s.name}</Link>
            {s.kind === "foundation" && <FoundationMark />}
            <span className="text-sm text-muted-foreground">{formatUsd(s.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Foundations: confirmed grants.{hasPeople && " People: self-reported by donors who chose to share."}
      </p>
    </Panel>
  )
}
