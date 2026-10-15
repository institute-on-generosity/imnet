import { CauseFilter } from "@/components/cause-filter"
import Link from "@/components/intent-link"
import { NeedRow } from "@/components/needs-panel"
import { Feed } from "@/components/post-card"
import { Panel, TwoColumn } from "@/components/shell"
import type { NeedKind } from "@/lib/needs"
import { getCallPosts, getCauses, getGrantsForPosts, getMovedPostIds, getMyInterestIds, getOpenNeeds, getSavedPostIds } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata = { title: "Ways to help" }

const SHOW = {
  all: { label: "All", calls: ["call_volunteers", "call_donations"] as const, needs: undefined as NeedKind[] | undefined },
  volunteer: { label: "Volunteer", calls: ["call_volunteers"] as const, needs: ["volunteer"] as NeedKind[] },
  donate: { label: "Donate", calls: ["call_donations"] as const, needs: ["item", "funding"] as NeedKind[] },
}
type Show = keyof typeof SHOW

// Everything organizations are asking for: calls for volunteers and donations (posts with photos
// and video) and their listed needs. Newest first; you help on their terms.
export default async function NeedsPage({ searchParams }: PageProps<"/needs">) {
  const { cause, show: rawShow } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const show: Show = rawShow === "volunteer" || rawShow === "donate" ? rawShow : "all"
  const userId = await getUserId()
  const [needs, calls, causes] = await Promise.all([
    getOpenNeeds({ cause: active, kinds: SHOW[show].needs }),
    getCallPosts({ kinds: [...SHOW[show].calls], cause: active }),
    getCauses(),
  ])
  const ids = calls.map((p) => p.id)
  const [interestIds, movedIds, savedIds, grantsByPost] = await Promise.all([
    getMyInterestIds(userId, needs.map((n) => n.id)), getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids),
  ])
  const href = (s: Show, c?: string) => {
    const p = new URLSearchParams()
    if (s !== "all") p.set("show", s)
    if (c) p.set("cause", c)
    const qs = p.toString()
    return qs ? `/needs?${qs}` : "/needs"
  }

  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">Each org says how to help: a sign-up, a donate page or an email. &quot;I&apos;m interested&quot; tells only their team.</Panel>}>
      <Panel className="space-y-3 p-4">
        <div>
          <h1 className="font-sans text-lg font-semibold tracking-normal">Ways to help</h1>
          <p className="text-sm text-muted-foreground">What organizations are asking for right now. Newest first.</p>
        </div>
        <nav aria-label="Ways to help" className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(Object.keys(SHOW) as Show[]).map((s) => (
            <Link key={s} href={href(s, active)} aria-current={show === s ? "page" : undefined}
              className={cn("rounded-full px-3 py-1 transition-colors", show === s ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {SHOW[s].label}
            </Link>
          ))}
        </nav>
        <CauseFilter causes={causes} active={active} basePath="/needs" hrefFor={(c) => href(show, c)} />
      </Panel>

      {calls.length > 0 && (
        <section aria-labelledby="calls" className="space-y-3">
          <h2 id="calls" className="px-1 font-sans text-lg font-semibold tracking-normal">
            {show === "volunteer" ? "Calls for volunteers" : show === "donate" ? "Calls for donations" : "Calls for volunteers and donations"}
          </h2>
          <Feed posts={calls} empty="" movedIds={movedIds} savedIds={savedIds} signedIn={!!userId} grantsByPost={grantsByPost} />
        </section>
      )}

      <section aria-labelledby="needs-list" className="space-y-3">
        <h2 id="needs-list" className="px-1 font-sans text-lg font-semibold tracking-normal">Current needs</h2>
        <Panel className="px-4">
          {needs.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{active ? "No open needs for this cause. Try all causes." : "No open needs right now."}</p>
          ) : (
            <ul className="divide-y">{needs.map((n) => <NeedRow key={n.id} need={n} interested={interestIds.has(n.id)} signedIn={!!userId} />)}</ul>
          )}
        </Panel>
      </section>
    </TwoColumn>
  )
}
