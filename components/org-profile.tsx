import { BadgeCheck, HandHeart, Plus } from "lucide-react"
import Link from "@/components/intent-link"
import { DonateButton } from "@/components/donate-button"
import { FollowButton } from "@/components/follow-button"
import { OrgMark } from "@/components/org-mark"
import { OlderPosts } from "@/components/older-posts"
import { OrgTypeBadge } from "@/components/org-type-badge"
import { Feed } from "@/components/post-card"
import { ShareButton } from "@/components/share-button"
import { Panel, TwoColumn } from "@/components/shell"
import { GrantsPanel } from "@/components/grants-panel"
import { ImpactCard, OrgFacts } from "@/components/rail-cards"
import { TopSupporters } from "@/components/top-supporters"
import type { Supporter } from "@/lib/queries"
import { orgCoverSrc } from "@/lib/cover"
import { EventsPanel } from "@/components/events-panel"
import { NeedsPanel } from "@/components/needs-panel"
import { ThanksButton } from "@/components/thanks-button"
import { SuggestedOrgs } from "@/components/side-cards"
import { SupporterToggle } from "@/components/supporter-toggle"
import { TrackView } from "@/components/track-view"
import { buttonVariants } from "@/components/ui/button"
import { footnotes } from "@/lib/footnotes"
import { backers, backersLabel } from "@/lib/grants"
import { ORG_TAB_LABEL, tabsFor, type OrgTab } from "@/lib/org-tabs"
import type { OrgSummaryWithMission } from "@/lib/queries"
import type { OrgEvent } from "@/lib/events"
import type { Need } from "@/lib/needs"
import type { Cause, Grant, ImpactStat, Org, Post } from "@/lib/types"
import { cn } from "@/lib/utils"

const longDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "")

type Props = {
  org: Org
  stats: ImpactStat[]
  causes: Cause[]
  followers: number
  posts: Post[]
  postsPaging: { next: string | null; isFirstPage: boolean }
  similar: OrgSummaryWithMission[]
  signedIn: boolean
  follow: { following: boolean; supporter: boolean }
  portfolio: Post[]
  movedIds?: Set<string>
  savedIds?: Set<string>
  grants: Grant[]
  grantsByPost: Map<string, Grant[]>
  tab: OrgTab
  needs: Need[]
  interestIds: Set<string>
  events: OrgEvent[]
  rsvpIds: Set<string>
  supporters: Supporter[]
}

export function OrgProfile({ org, stats, causes, followers, posts, postsPaging, portfolio, similar, signedIn, follow, movedIds, savedIds, grants, grantsByPost, tab, needs, interestIds, events, rsvpIds, supporters }: Props) {
  const base = `/o/${org.slug}`
  return (
    <TwoColumn
      right={
        <>
          {/* Proof beside the story. On phones these cards appear in the main column instead. */}
          {tab === "home" && (
            <div className="hidden space-y-3 lg:block">
              <ImpactCard stats={stats} />
              {org.org_type === "nonprofit" && <TopSupporters supporters={supporters} />}
            </div>
          )}
          <OrgFacts org={org} causes={causes} />
          <SuggestedOrgs title="Similar organizations" orgs={similar} signedIn={signedIn} />
        </>
      }
    >
      <TrackView orgId={org.id} />

      <Panel className="overflow-hidden">
        <Cover org={org} />
        <div className="px-4 pb-4 sm:px-6">
          <div className="relative -mt-12 sm:-mt-14"><OrgMark org={org} size="xl" /></div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{org.name}</h1>
            <OrgTypeBadge type={org.org_type} className="py-1 pr-2.5 pl-2 text-xs" />
          </div>
          {org.mission && <p className="mt-1.5 line-clamp-2 max-w-prose text-lg leading-snug text-foreground/80">{org.mission}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {causes[0] && <span>{causes.slice(0, 2).map((c) => c.name).join(", ")}{causes.length > 2 && ` +${causes.length - 2}`}</span>}
            {causes[0] && <span aria-hidden>•</span>}
            {org.location && <><span>{org.location}</span><span aria-hidden>•</span></>}
            <span>{followers.toLocaleString("en-US")} {followers === 1 ? "follower" : "followers"}</span>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1"><BadgeCheck className="size-4 text-leaf" aria-hidden />Verified</span>
          </p>
          {org.org_type === "nonprofit" && <Backers grants={grants} />}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {signedIn ? (
              <FollowButton orgId={org.id} following={follow.following} />
            ) : (
              <Link href="/login" className={buttonVariants()}><Plus aria-hidden />Follow</Link>
            )}
            {org.everyorg_slug && <DonateButton orgId={org.id} everyorgSlug={org.everyorg_slug} signedIn={signedIn} />}
            <ShareButton path={base} title={org.name} orgId={org.id} variant="pill" />
            {signedIn && follow.following && <SupporterToggle orgId={org.id} orgType={org.org_type} supporter={follow.supporter} />}
            {signedIn && <ThanksButton orgId={org.id} orgName={org.name} />}
          </div>
        </div>
        <nav aria-label={`${org.name} sections`} className="flex border-t px-2 sm:px-4">
          {tabsFor(org.org_type).map((t) => (
            <Link
              key={t}
              href={t === "home" ? base : `${base}?tab=${t}`}
              aria-current={tab === t ? "page" : undefined}
              className={cn(
                "border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
                tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {ORG_TAB_LABEL[t]}
            </Link>
          ))}
        </nav>
      </Panel>

      {tab === "home" && (
        <>
          <GiftsFund org={org} />
          <div className="space-y-3 lg:hidden">
            <ImpactCard stats={stats} where="main" />
            {org.org_type === "nonprofit" && <TopSupporters supporters={supporters} where="main" />}
          </div>
          <NeedsPanel needs={needs} interestIds={interestIds} signedIn={signedIn} />
          <EventsPanel events={events} rsvpIds={rsvpIds} signedIn={signedIn} />
          {org.org_type === "foundation" && <GrantsPanel org={org} grants={grants} />}
          <section aria-labelledby="recent" className="space-y-3 pt-2">
            <h2 id="recent" className="px-1 h-section">Posts</h2>
            <Feed posts={posts.slice(0, 3)} empty={`${org.name} hasn't posted yet.`} movedIds={movedIds} savedIds={savedIds} signedIn={signedIn} grantsByPost={grantsByPost} hideFollow />
            {posts.length > 3 && (
              <Link href={`${base}?tab=posts`} className={buttonVariants({ variant: "outline", className: "w-full" })}>Show all posts</Link>
            )}
          </section>
        </>
      )}

      {tab === "about" && (
        <>
          <Panel className="p-4 sm:p-6">
            <h2 className="h-section">Overview</h2>
            {org.mission && <p className="story mt-2 font-medium">{org.mission}</p>}
            {org.about && <p className="story mt-3 whitespace-pre-line text-foreground/85">{org.about}</p>}
            <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
              {org.website && (
                <>
                  <dt className="font-semibold">Website</dt>
                  <dd><a href={org.website} target="_blank" rel="noopener noreferrer" className="text-leaf hover:underline">{host(org.website)}</a></dd>
                </>
              )}
              {org.location && (<><dt className="font-semibold">Location</dt><dd>{org.location}</dd></>)}
              {org.founded_year && (<><dt className="font-semibold">Founded</dt><dd>{org.founded_year}</dd></>)}
              {org.team_size && (<><dt className="font-semibold">Team</dt><dd>{org.team_size}</dd></>)}
              {org.programs.length > 0 && (
                <>
                  <dt className="font-semibold">Programs</dt>
                  <dd><ul className="flex flex-wrap gap-1.5">{org.programs.map((p) => <li key={p} className="rounded-full border px-2.5 py-0.5">{p}</li>)}</ul></dd>
                </>
              )}
              {org.ein && (
                <>
                  <dt className="font-semibold">EIN</dt>
                  <dd>{org.ein}</dd>
                </>
              )}
              {causes.length > 0 && (
                <>
                  <dt className="font-semibold">Causes</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {causes.map((c) => (
                      <Link key={c.slug} href={`/?cause=${c.slug}`} className="rounded-full bg-muted px-2.5 py-0.5 hover:bg-secondary">{c.name}</Link>
                    ))}
                  </dd>
                </>
              )}
              <dt className="font-semibold">Verified</dt>
              <dd>EIN and staff email checked by imnet</dd>
            </dl>
          </Panel>
          <GiftsFund org={org} />
          <ImpactLedger stats={stats} />
          <GrantsPanel org={org} grants={grants} />
        </>
      )}

      {tab === "posts" && (
        <>
          <Feed posts={posts} empty={`${org.name} hasn't posted yet.`} movedIds={movedIds} savedIds={savedIds} signedIn={signedIn} grantsByPost={grantsByPost} hideFollow />
          <OlderPosts
            olderHref={postsPaging.next ? `${base}?tab=posts&before=${postsPaging.next}` : null}
            newestHref={`${base}?tab=posts`}
            isFirstPage={postsPaging.isFirstPage}
          />
        </>
      )}

      {tab === "portfolio" && (
        <>
          <Panel className="p-4 sm:p-6">
            <h2 className="h-section">Portfolio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Grant reports from nonprofits {org.name} funds.</p>
          </Panel>
          <Feed posts={portfolio} empty="No grant reports yet. They appear here when grantees post them." movedIds={movedIds} savedIds={savedIds} signedIn={signedIn} grantsByPost={grantsByPost} />
        </>
      )}
    </TwoColumn>
  )
}

// Cover photo (wide, like LinkedIn's), or the type's patterned banner when there's none.
function Cover({ org }: { org: Org }) {
  const src = orgCoverSrc(org.cover_url)
  if (src) {
    return (
      <div className="relative aspect-[3/1] bg-muted sm:aspect-[4/1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" fetchPriority="high" className="size-full object-cover" />
      </div>
    )
  }
  return org.org_type === "foundation" ? (
    <div className="relative aspect-[3/1] bg-primary sm:aspect-[4/1]">
      <div aria-hidden className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(135deg,transparent_0_14px,var(--marigold)_14px_15px)]" />
    </div>
  ) : (
    <div className="relative aspect-[3/1] bg-leaf sm:aspect-[4/1]">
      <div aria-hidden className="absolute inset-0 opacity-15 [background:repeating-linear-gradient(135deg,transparent_0_14px,white_14px_15px)]" />
    </div>
  )
}

// The giving pitch, first thing under the header: what a gift does here.
function GiftsFund({ org }: { org: Org }) {
  if (!org.what_gifts_fund) return null
  return (
    <Panel aria-labelledby="gifts-fund" className="flex gap-3 border-marigold/40 bg-marigold-soft p-4 sm:p-5">
      <HandHeart className="mt-0.5 size-6 shrink-0 text-marigold" aria-hidden />
      <div>
        <h2 id="gifts-fund" className="font-sans text-sm font-semibold tracking-normal text-amber-900">What your gift funds</h2>
        <p className="story mt-1 text-[1.0625rem] leading-relaxed">{org.what_gifts_fund}</p>
      </div>
    </Panel>
  )
}

// Every figure is footnoted to its source: imnet's no-fabrication promise, made visible.
function ImpactLedger({ stats }: { stats: ImpactStat[] }) {
  if (stats.length === 0) return null
  const { sources, marks } = footnotes(stats)
  return (
    <Panel aria-labelledby="impact" className="p-4 sm:p-6">
      <h2 id="impact" className="h-section">Impact so far</h2>
      <dl className="mt-3 divide-y border-y">
        {stats.map((s, i) => (
          <div key={s.id} className="flex items-baseline justify-between gap-6 py-3.5">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="font-heading text-3xl font-semibold tabular-nums">
              {s.value}
              <sup className="ml-0.5 align-super font-sans text-sm font-medium">
                <a href={`#source-${marks[i]}`} className="text-leaf" aria-label={`Source ${marks[i]}`}>{marks[i]}</a>
              </sup>
            </dd>
          </div>
        ))}
      </dl>
      <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
        {sources.map((src, i) => (
          <li key={src.url} id={`source-${i + 1}`} className="flex scroll-mt-20 gap-2">
            <span className="w-4 shrink-0 text-leaf tabular-nums">{i + 1}</span>
            <span>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="break-all text-foreground underline underline-offset-4">
                {src.url.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
              {src.asOf && <>, as of {longDate(src.asOf)}</>}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// Trust signal from confirmed grants only: who funds this nonprofit.
function Backers({ grants }: { grants: Grant[] }) {
  const funders = backers(grants)
  if (funders.length === 0) return null
  return (
    <Link href="?tab=about" title={funders.map((f) => f.name).join(", ")} className="mt-3 flex w-fit items-center gap-2.5 rounded-full border bg-card py-1 pr-3 pl-1 text-sm hover:bg-muted">
      <span className="flex -space-x-2">
        {funders.slice(0, 3).map((f) => (
          <span key={f.id} className="rounded-md ring-2 ring-card">
            <OrgMark org={f} size="sm" />
          </span>
        ))}
      </span>
      <span>{backersLabel(funders.map((f) => f.name))}</span>
    </Link>
  )
}

