"use client"

import { Check, ChevronDown, Plus } from "lucide-react"
import { Fragment, useState } from "react"
import { setCauseFollow } from "@/app/actions"
import { FollowButton } from "@/components/follow-button"
import Link from "@/components/intent-link"
import { OrgMark } from "@/components/org-mark"
import { FoundationMark } from "@/components/org-type-badge"
import { CAUSE_ICON } from "@/lib/cause-icons"
import type { OrgSummaryWithMission } from "@/lib/queries"
import type { Cause } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = { causes: Cause[]; followed: string[]; orgsByCause: Record<string, OrgSummaryWithMission[]>; followingOrgIds: string[]; rail?: boolean }

// Your causes (F-088). Each card shows who works on that cause (logos); open a card to see every
// organization in it, follow them, or follow the cause with the Follow/Following pill.
export function CauseGrid({ causes, followed, orgsByCause, followingOrgIds, rail = false }: Props) {
  // Plain state so the pill flips on click and stays (B-032); the server is told in the background.
  const [mine, setMine] = useState(() => new Set(followed))
  const [open, setOpen] = useState<string | null>(null)
  // F-098: causes you follow come first and the rest wait behind "Explore more causes", so the
  // page leads with your network, not a wall of cards. Order is fixed at load (no jumping).
  const [firstFollowed] = useState(() => new Set(followed))
  const [showAll, setShowAll] = useState(followed.length === 0)
  const ordered = [...causes.filter((c) => firstFollowed.has(c.slug)), ...causes.filter((c) => !firstFollowed.has(c.slug))]
  const visible = showAll ? ordered : ordered.filter((c) => firstFollowed.has(c.slug) || c.slug === open)
  const hidden = ordered.length - visible.length
  const following = new Set(followingOrgIds)
  const toggle = (slug: string) => {
    const on = mine.has(slug)
    const flip = (s: Set<string>) => { const n = new Set(s); if (on) n.delete(slug); else n.add(slug); return n }
    setMine(flip)
    setCauseFollow(slug, !on).catch(() => setMine((s) => { const n = new Set(s); if (on) n.add(slug); else n.delete(slug); return n }))
  }

  // The panel follows its card in the source and spans the full row; dense packing lets the rest of
  // the card's row fill in before it, so the panel opens right under that row at any column count.
  return (
    <ul className={rail ? "grid grid-cols-1 gap-2" : "grid grid-flow-row-dense grid-cols-2 gap-2 sm:grid-cols-3"}>
      {visible.map((c) => {
        const on = mine.has(c.slug)
        const expanded = open === c.slug
        const orgs = orgsByCause[c.slug] ?? []
        const Icon = CAUSE_ICON[c.slug] ?? Check
        const panelId = `cause-panel-${c.slug}`
        return (
          <Fragment key={c.slug}>
            <li className={cn("relative rounded-xl border transition-colors", on ? "border-leaf bg-leaf-soft" : "bg-card", expanded && "ring-2 ring-leaf/40")}>
              <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : c.slug)}
                className={cn("flex w-full rounded-xl text-left hover:bg-black/[0.02]", rail ? "items-center gap-2.5 p-2.5 pr-24" : "flex-col items-start gap-2.5 p-3")}>
                <span className={cn("grid shrink-0 place-items-center rounded-lg", rail ? "size-9" : "size-10", on ? "bg-leaf text-white" : "bg-muted text-muted-foreground")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="w-full min-w-0">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className={cn("flex items-center gap-1.5", rail ? "mt-0.5" : "mt-1")}>
                    <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                      {orgs.slice(0, 3).map((o) => <span key={o.id} className="rounded-md ring-2 ring-card"><OrgMark org={o} size="sm" /></span>)}
                    </span>
                    <span className="text-xs text-muted-foreground">{orgs.length}</span>
                    <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                  </span>
                  <span className="sr-only">: {orgs.length} organizations, {expanded ? "hide" : "show"} them</span>
                </span>
              </button>
              <button type="button" aria-pressed={on} aria-label={`${on ? "Following" : "Follow"} ${c.name}`} onClick={() => toggle(c.slug)}
                className={cn(rail ? "absolute top-1/2 right-2.5 -translate-y-1/2" : "absolute top-[18px] right-3", "inline-flex h-7 items-center gap-1 rounded-full border pr-2.5 pl-[9px] text-xs font-semibold transition-[color,background-color,transform] active:scale-95",
                  on ? "border-leaf/40 bg-card text-leaf hover:bg-muted" : "border-leaf text-leaf hover:bg-leaf-soft")}>
                {on ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}{on ? "Following" : "Follow"}
              </button>
            </li>
            {expanded && (
              <li id={panelId} className={rail ? "" : "col-span-2 sm:col-span-3"}>
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center gap-3 border-b p-3">
                    <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{c.name}</span> <span className="text-muted-foreground">· {orgs.length} organizations</span></p>
                    <button type="button" onClick={() => toggle(c.slug)}
                      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full py-1 pr-3 pl-[11px] text-xs font-semibold", on ? "border text-muted-foreground hover:bg-muted" : "bg-leaf text-white hover:bg-leaf/90")}>
                      {on ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}{on ? "Following cause" : "Follow cause"}
                    </button>
                  </div>
                  <ul className={cn("grid max-h-80 overflow-y-auto", !rail && "sm:grid-cols-2")}>
                    {orgs.map((o) => (
                      <li key={o.id} className={cn("flex items-center gap-3 border-b px-3 py-2.5", !rail && "sm:odd:border-r")}>
                        <OrgMark org={o} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5"><Link href={`/o/${o.slug}`} className="truncate text-sm font-semibold hover:underline">{o.name}</Link>{o.org_type === "foundation" && <FoundationMark />}</p>
                          {o.mission && <p className="line-clamp-1 text-xs text-muted-foreground">{o.mission}</p>}
                        </div>
                        <FollowButton orgId={o.id} orgName={o.name} following={following.has(o.id)} variant="icon" />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )}
          </Fragment>
        )
      })}
      {(hidden > 0 || (showAll && firstFollowed.size > 0)) && (
        <li className={rail ? "" : "col-span-2 sm:col-span-3"}>
          <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-sm font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground">
            {showAll ? "Show only causes you follow" : `Explore ${hidden} more ${hidden === 1 ? "cause" : "causes"}`}
            <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} aria-hidden />
          </button>
        </li>
      )}
    </ul>
  )
}
