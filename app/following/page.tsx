import { redirect } from "next/navigation"
import Link from "@/components/intent-link"
import { FollowButton } from "@/components/follow-button"
import { OlderPosts } from "@/components/older-posts"
import { OrgMark } from "@/components/org-mark"
import { FoundationMark } from "@/components/org-type-badge"
import { PersonAvatar } from "@/components/person-avatar"
import { Feed } from "@/components/post-card"
import { Panel, TwoColumn } from "@/components/shell"
import { SuggestedOrgs } from "@/components/side-cards"
import { CAUSE_ICON } from "@/lib/cause-icons"
import { decodeCursor } from "@/lib/cursor"
import { portfolioContext } from "@/lib/portfolio"
import {
  getCauses, getOrgsByCause, getConfirmedGrantIds, getFeedPage, getFollowedCauseSlugs, getFollowedOrgsDetail, getFollowedPeople,
  getGrantsForPosts, getMovedPostIds, getOrgsInCauses, getSavedPostIds,
} from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { CauseGrid } from "./cause-grid"

export const metadata = { title: "Following" }

type Tab = "feed" | "orgs" | "people"
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// Your network (F-088): the causes you follow, then what you follow in them: a feed, the
// organizations and the people. Suggestions come from your causes, alphabetical.
export default async function FollowingPage({ searchParams }: PageProps<"/following">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/following")
  const { tab: rawTab, cause: rawCause, before } = await searchParams
  const tab: Tab = rawTab === "orgs" || rawTab === "people" ? rawTab : "feed"
  const [causes, myCauses, orgsByCause, orgs, people] = await Promise.all([
    getCauses(), getFollowedCauseSlugs(userId), getOrgsByCause(), getFollowedOrgsDetail(userId), getFollowedPeople(userId),
  ])
  const cause = typeof rawCause === "string" && myCauses.includes(rawCause) ? rawCause : undefined
  const causeName = (slug: string) => causes.find((c) => c.slug === slug)?.name ?? slug
  const orgIds = orgs.map((o) => o.id)
  const suggested = await getOrgsInCauses(myCauses, orgIds, 5)
  const href = (t: Tab, c?: string) => {
    const p = new URLSearchParams()
    if (t !== "feed") p.set("tab", t)
    if (c) p.set("cause", c)
    const q = p.toString()
    return q ? `/following?${q}` : "/following"
  }

  return (
    <TwoColumn right={<SuggestedOrgs title={myCauses.length ? "Suggested in your causes" : "Add to your network"} orgs={suggested} signedIn />}>
      <Panel className="p-4 sm:p-6">
        <h1 className="h-page">Following</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {myCauses.length ? `${plural(myCauses.length, "cause")}, ${plural(orgs.length, "organization")} and ${plural(people.length, "person", "people")}.` : "Pick the causes you care about to shape this page"} Only you see this.
        </p>
        <h2 className="h-sub mt-5 mb-2">Your causes</h2>
        <CauseGrid causes={causes} followed={myCauses} orgsByCause={orgsByCause} followingOrgIds={orgs.map((o) => o.id)} />
      </Panel>

      <Panel className="overflow-hidden">
        <nav aria-label="Following sections" className="flex border-b px-2 sm:px-4">
          {([["feed", "Feed"], ["orgs", `Organizations · ${orgs.length}`], ["people", `People · ${people.length}`]] as const).map(([t, label]) => (
            <Link key={t} href={href(t, cause)} aria-current={tab === t ? "page" : undefined}
              className={cn("border-b-2 px-3 py-3 text-sm font-semibold transition-colors", tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {label}
            </Link>
          ))}
        </nav>
        {myCauses.length > 0 && (
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

      {tab === "feed" && <FollowingFeed userId={userId} orgIds={orgIds} personIds={people.map((p) => p.id)} cause={cause} before={typeof before === "string" ? before : undefined} href={href} />}

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
        <Panel>
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
                      <Link href={`/u/${p.handle}`} className="font-semibold hover:underline">{name}</Link>
                      {p.bio && <p className="truncate text-sm text-muted-foreground">{p.bio}</p>}
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

async function FollowingFeed({ userId, orgIds, personIds, cause, before, href }: { userId: string; orgIds: string[]; personIds: string[]; cause?: string; before?: string; href: (t: Tab, c?: string) => string }) {
  const cursor = decodeCursor(before)
  if (orgIds.length === 0 && personIds.length === 0) {
    return <Panel className="p-6 text-sm text-muted-foreground">Follow organizations and people to see their posts here</Panel>
  }
  const db = await createClient()
  const { data: f } = await db.from("orgs").select("id").in("id", orgIds).eq("org_type", "foundation")
  const reportGrantIds = f?.length ? await getConfirmedGrantIds(f.map((o) => o.id)) : []
  const page = await getFeedPage({ cause, orgIds, personIds: cause ? [] : personIds, reportGrantIds, before: cursor ?? undefined })
  const ids = page.posts.map((p) => p.id)
  const [movedIds, savedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids)])
  const base = href("feed", cause)
  return (
    <>
      <Feed posts={page.posts} empty="Nothing new in this cause yet" movedIds={movedIds} savedIds={savedIds} signedIn grantsByPost={grantsByPost} context={portfolioContext(page.posts, new Set(orgIds))} />
      <OlderPosts olderHref={page.next ? `${base}${base.includes("?") ? "&" : "?"}before=${page.next}` : null} newestHref={base} isFirstPage={!cursor} />
    </>
  )
}
