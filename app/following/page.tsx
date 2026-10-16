import { BadgeCheck } from "lucide-react"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "@/components/intent-link"
import { FollowButton } from "@/components/follow-button"
import { OrgMark } from "@/components/org-mark"
import { FoundationMark } from "@/components/org-type-badge"
import { PersonAvatar } from "@/components/person-avatar"
import { Panel, TwoColumn } from "@/components/shell"
import { SuggestedOrgs } from "@/components/side-cards"
import { FriendsActivity } from "@/components/following-friends"
import { mixWall, SuggestionWall } from "@/components/follow-cards"
import { CAUSE_ICON } from "@/lib/cause-icons"
import {
  getCauses, getOrgsByCause, getFollowedCauseSlugs, getFollowedOrgsDetail, getFollowedPeople, getNotableGivers, getGivesTo, getFriendsExperiences, getFriendSuggestions, getOrgsInCauses,
} from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"
import { CauseGrid } from "./cause-grid"

export const metadata = { title: "Following" }

type Tab = "orgs" | "people"

// Your network (F-088): the causes you follow, suggestions, what friends are up to, then the
// organizations and people you follow. Their posts live on Home under the "Following" filter (F-118).
export default async function FollowingPage({ searchParams }: PageProps<"/following">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/following")
  const { tab: rawTab, cause: rawCause } = await searchParams
  const tab: Tab = rawTab === "people" ? "people" : "orgs"
  const [causes, myCauses, orgsByCause, orgs, people, notable, friends] = await Promise.all([
    getCauses(), getFollowedCauseSlugs(userId), getOrgsByCause(), getFollowedOrgsDetail(userId), getFollowedPeople(userId), getNotableGivers(), getFriendSuggestions(userId),
  ])
  const cause = typeof rawCause === "string" && myCauses.includes(rawCause) ? rawCause : undefined
  const causeName = (slug: string) => causes.find((c) => c.slug === slug)?.name ?? slug
  const orgIds = orgs.map((o) => o.id)
  const pool = await getOrgsInCauses(myCauses, orgIds, 11)
  const wallOrgs = pool.slice(0, 6)
  const suggested = pool.slice(6)
  const href = (t: Tab, c?: string) => {
    const p = new URLSearchParams()
    if (t !== "orgs") p.set("tab", t)
    if (c) p.set("cause", c)
    const q = p.toString()
    return q ? `/following?${q}` : "/following"
  }

  const givesTo = tab === "people" ? await getGivesTo(people.filter((p) => p.public_figure).map((p) => p.id)) : new Map<string, OrgSummary[]>()
  return (
    <TwoColumn right={<>
      <SuggestedOrgs title={myCauses.length ? "Suggested in your causes" : "Add to your network"} orgs={suggested} signedIn />
    </>}>
      <Panel className="p-4 sm:p-6">
        <h1 className="h-page">Following</h1>
        {myCauses.length === 0 && <p className="mt-1.5 text-sm text-muted-foreground">Pick the causes you care about to shape this page</p>}
        <h2 className="h-sub mt-5 mb-2">Your causes</h2>
        <CauseGrid causes={causes} followed={myCauses} orgsByCause={orgsByCause} followingOrgIds={orgs.map((o) => o.id)} />
        {/* F-116: organizations, friends and notable givers to follow, mixed like a pin board. */}
        <SuggestionWall items={mixWall(wallOrgs, friends.slice(0, 6), notable.map((g) => ({ g, following: people.some((p) => p.id === g.id) })).filter((n) => !n.following))} />
      </Panel>

      {/* F-117: what friends just did, row by row, above everything else you follow. */}
      <Suspense fallback={null}><PeopleActivity userId={userId} /></Suspense>

      <Panel className="overflow-hidden">
        <nav aria-label="Following sections" className="flex border-b px-2 sm:px-4">
          {([["orgs", `Organizations · ${orgs.length}`], ["people", `People · ${people.length}`]] as const).map(([t, label]) => (
            <Link key={t} href={href(t, cause)} aria-current={tab === t ? "page" : undefined}
              className={cn("border-b-2 px-3 py-3 text-sm font-semibold transition-colors", tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {label}
            </Link>
          ))}
        </nav>
        {myCauses.length > 0 && tab !== "people" && (
          <nav aria-label="Filter by your causes" className="flex gap-1.5 overflow-x-auto p-3 [scrollbar-width:none]">
            <Link href={href(tab)} className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", !cause ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>All my causes</Link>
            {myCauses.map((c) => {
              const Icon = CAUSE_ICON[c]
              return (
                <Link key={c} href={href(tab, c)} aria-current={cause === c ? "page" : undefined}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm", cause === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {Icon && <Icon className="size-3.5" aria-hidden />}{causeName(c)}
                </Link>
              )
            })}
          </nav>
        )}
      </Panel>


      {tab === "orgs" && (
        <Panel>
          {(() => {
            const list = cause ? orgs.filter((o) => o.causes.includes(cause)) : orgs
            if (list.length === 0) return <p className="p-6 text-sm text-muted-foreground">No organizations here yet. Follow some from the suggestions.</p>
            return (
              <ul className="divide-y">
                {list.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 p-4">
                    <span className="mt-1 shrink-0"><OrgMark org={o} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5"><Link href={`/o/${o.slug}`} className="truncate font-semibold hover:underline">{o.name}</Link>{o.org_type === "foundation" && <FoundationMark />}</p>
                      {o.mission && <p className="line-clamp-2 text-sm text-muted-foreground">{o.mission}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{o.causes.map(causeName).join(" · ")}</p>
                    </div>
                    <FollowButton orgId={o.id} orgName={o.name} following variant="icon" />
                  </li>
                ))}
              </ul>
            )
          })()}
        </Panel>
      )}

      {tab === "people" && (
        <Panel aria-labelledby="people-you-follow">
          <h2 id="people-you-follow" className="h-section border-b px-4 py-3">People you follow</h2>
          {people.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">You don&apos;t follow anyone yet. Follow people from their profiles or posts.</p>
          ) : (
            <ul className="divide-y">
              {people.map((p) => {
                const name = p.display_name ?? `@${p.handle}`
                return (
                  <li key={p.id} className="flex items-center gap-3 p-4">
                    <PersonAvatar name={name} avatarUrl={p.avatar_url} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2">
                        <Link href={`/u/${p.handle}`} className="font-semibold hover:underline">{name}</Link>
                        {p.public_figure && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><BadgeCheck className="size-3.5" aria-hidden />{p.public_figure_note ?? "Public figure"}</span>}
                      </p>
                      {p.bio && <p className="truncate text-sm text-muted-foreground">{p.bio}</p>}
                      {p.public_figure && (givesTo.get(p.id)?.length ?? 0) > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">Gives to {givesTo.get(p.id)!.map((o) => o.name).join(", ")}</p>
                      )}
                      {p.location && <p className="text-xs text-muted-foreground">{p.location}</p>}
                    </div>
                    <FollowButton orgId={p.id} orgName={name} following variant="icon" person />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}
    </TwoColumn>
  )
}

async function PeopleActivity({ userId }: { userId: string }) {
  return <FriendsActivity items={await getFriendsExperiences(userId, 8)} />
}
