import { CircleCheck, HandCoins, HandHelping, Package } from "lucide-react"
import Link from "@/components/intent-link"
import { NEED_KIND_LABEL, type Need, type NeedWithOrg } from "@/lib/needs"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"
import { ToggleSignal } from "./toggle-signal"

const ICONS = { item: Package, volunteer: HandHelping, funding: HandCoins }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// What the org needs right now, beyond money, and how to help. Met needs stay a month.
export function NeedsPanel({ needs, interestIds, signedIn }: { needs: Need[]; interestIds: Set<string>; signedIn: boolean }) {
  if (needs.length === 0) return null
  return (
    <Panel aria-labelledby="needs" className="p-4 sm:p-6">
      <h2 id="needs" className="font-sans text-lg font-semibold tracking-normal">Current needs</h2>
      <ul className="mt-3 divide-y border-y">
        {needs.map((n) => <NeedRow key={n.id} need={n} interested={interestIds.has(n.id)} signedIn={signedIn} />)}
      </ul>
    </Panel>
  )
}

// One need. With an org (network-wide lists), the org's mark replaces the kind icon.
export function NeedRow({ need: n, compact, interested = false, signedIn = false }: { need: Need | NeedWithOrg; compact?: boolean; interested?: boolean; signedIn?: boolean }) {
  const org = "org" in n ? n.org : null
  const Icon = n.met_at ? CircleCheck : ICONS[n.kind]
  if (compact && org) {
    // Sidebar: logo, title, kind, org, then a small Help link (same shape as event rows).
    return (
      <li className="flex gap-3 py-3">
        {/* Same 48px column and cap-height top (mt-[3px]) as the event date tiles, so stacked cards line up. */}
        <span className="mt-[3px] shrink-0"><OrgMark org={org} size="md" /></span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">{n.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{NEED_KIND_LABEL[n.kind]}</p>
          <Link href={`/o/${org.slug}`} className="block truncate text-xs text-muted-foreground hover:underline">{org.name}</Link>
          <a href={n.help_url} target={n.help_url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer"
            className="mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold text-leaf hover:bg-leaf-soft">
            Help<span className="sr-only"> with {n.title}</span>
          </a>
        </div>
      </li>
    )
  }
  return (
    // Phones: when there are two buttons, they wrap under the text instead of squeezing it.
    <li className={compact ? "flex gap-3 py-2.5" : "flex flex-wrap gap-x-3 gap-y-2 py-3.5 sm:flex-nowrap"}>
      {org ? (
        <span className="mt-1.5 shrink-0"><OrgMark org={org} size="md" /></span>
      ) : (
        <Icon className={n.met_at ? "mt-0.5 size-5 shrink-0 text-leaf" : "mt-0.5 size-5 shrink-0 text-muted-foreground"} aria-hidden />
      )}
      <div className={compact ? "min-w-0 flex-1" : "min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto"}>
        <p className={compact ? "text-sm font-semibold" : "font-semibold"}>
          {n.title}
          <span className="sr-only"> ({NEED_KIND_LABEL[n.kind]})</span>
        </p>
        {org && (
          <p className="text-sm text-muted-foreground">
            {NEED_KIND_LABEL[n.kind]}, <Link href={`/o/${org.slug}`} className="hover:underline">{org.name}</Link>
          </p>
        )}
        {n.detail && !n.met_at && !compact && <p className="mt-0.5 text-sm text-muted-foreground">{n.detail}</p>}
        {n.met_at && <p className="mt-0.5 text-sm text-leaf">Met {day(n.met_at)}. Thank you.</p>}
      </div>
      {!n.met_at && (
        <div className={compact ? "flex shrink-0" : "flex shrink-0 gap-2 pl-8 sm:pl-0"}>
          {!compact && n.kind === "volunteer" && (
            <ToggleSignal kind="interest" id={n.id} on={interested} signedIn={signedIn} label={`in ${n.title}`} />
          )}
          <a
          href={n.help_url}
          target={n.help_url.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="h-fit shrink-0 rounded-full border px-3 py-1 text-sm font-semibold text-leaf hover:bg-leaf-soft"
        >
            Help<span className="sr-only"> with {n.title}</span>
          </a>
        </div>
      )}
    </li>
  )
}

// Home sidebar: the newest few needs across the network.
export function WaysToHelp({ needs, cause }: { needs: NeedWithOrg[]; cause?: string }) {
  if (needs.length === 0) return null
  return (
    <Panel aria-labelledby="ways-to-help" className="p-4">
      <h2 id="ways-to-help" className="font-sans text-base font-semibold tracking-normal">Ways to help</h2>
      <ul className="mt-1 divide-y">
        {needs.map((n) => <NeedRow key={n.id} need={n} compact />)}
      </ul>
      <Link href={cause ? `/needs?cause=${cause}` : "/needs"} className="mt-2 block text-sm font-semibold text-leaf hover:underline">See all needs</Link>
    </Panel>
  )
}
