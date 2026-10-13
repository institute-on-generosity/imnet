import Link from "next/link"
import { DonateButton } from "@/components/donate-button"
import { FollowButton } from "@/components/follow-button"
import { OrgMark } from "@/components/org-mark"
import { OlderPosts } from "@/components/older-posts"
import { OrgTypeBadge } from "@/components/org-type-badge"
import { Feed } from "@/components/post-card"
import { ShareButton } from "@/components/share-button"
import { Panel, TwoColumn } from "@/components/shell"
import { GrantsPanel } from "@/components/grants-panel"
import { SuggestedOrgs } from "@/components/side-cards"
import { SupporterToggle } from "@/components/supporter-toggle"
import { TrackView } from "@/components/track-view"
import { buttonVariants } from "@/components/ui/button"
import { footnotes } from "@/lib/footnotes"
import { backers, backersLabel } from "@/lib/grants"
import { ORG_TAB_LABEL, tabsFor, type OrgTab } from "@/lib/org-tabs"
import type { OrgSummaryWithMission } from "@/lib/queries"
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
  grants: Grant[]
  grantsByPost: Map<string, Grant[]>
  tab: OrgTab
}

export function OrgProfile({ org, stats, causes, followers, posts, postsPaging, portfolio, similar, signedIn, follow, movedIds, grants, grantsByPost, tab }: Props) {
  const base = `/o/${org.slug}`
  return (
    <TwoColumn right={<SuggestedOrgs title="Similar organizations" orgs={similar} signedIn={signedIn} />}>
      <TrackView orgId={org.id} />

      <Panel className="overflow-hidden">
        {org.org_type === "foundation" ? (
          <div className="relative h-28 bg-primary sm:h-36">
            <div aria-hidden className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(135deg,transparent_0_14px,var(--marigold)_14px_15px)]" />
          </div>
        ) : (
          <div className="relative h-28 bg-leaf sm:h-36">
            <div aria-hidden className="absolute inset-0 opacity-15 [background:repeating-linear-gradient(135deg,transparent_0_14px,white_14px_15px)]" />
          </div>
        )}
        <div className="px-4 pb-4 sm:px-6">
          <div className="relative -mt-12 sm:-mt-14"><OrgMark org={org} size="xl" /></div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-3xl font-semibold">{org.name}</h1>
            <OrgTypeBadge type={org.org_type} className="px-2.5 py-1 text-xs" />
          </div>
          {org.mission && <p className="mt-1 line-clamp-2 max-w-prose text-muted-foreground">{org.mission}</p>}
          {org.org_type === "nonprofit" && <Backers grants={grants} />}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {causes.length > 0 && <span>{causes.map((c) => c.name).join(", ")}</span>}
            <span>{followers} {followers === 1 ? "follower" : "followers"}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {signedIn ? (
              <FollowButton orgId={org.id} slug={org.slug} following={follow.following} />
            ) : (
              <Link href="/login" className={buttonVariants()}>Follow</Link>
            )}
            {org.everyorg_slug && <DonateButton orgId={org.id} everyorgSlug={org.everyorg_slug} />}
            <ShareButton path={base} title={org.name} orgId={org.id} variant="pill" />
          </div>
          {signedIn && follow.following && (
            <div className="mt-2">
              <SupporterToggle orgId={org.id} orgType={org.org_type} supporter={follow.supporter} />
            </div>
          )}
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
          {org.mission && (
            <Panel className="p-4 sm:p-6">
              <h2 className="font-sans text-lg font-semibold tracking-normal">About</h2>
              <p className="story mt-2 line-clamp-3">{org.mission}</p>
              <Link href={`${base}?tab=about`} className="mt-2 inline-block text-sm font-semibold text-muted-foreground hover:text-leaf hover:underline">
                Show all details
              </Link>
            </Panel>
          )}
          <GiftsFund org={org} />
          <ImpactLedger stats={stats} />
          <GrantsPanel org={org} grants={grants} />
          <section aria-labelledby="recent" className="space-y-3">
            <h2 id="recent" className="px-1 font-sans text-lg font-semibold tracking-normal">Recent posts</h2>
            <Feed posts={posts.slice(0, 3)} empty={`${org.name} hasn't posted yet.`} movedIds={movedIds} signedIn={signedIn} grantsByPost={grantsByPost} />
            {posts.length > 3 && (
              <Link href={`${base}?tab=posts`} className={buttonVariants({ variant: "outline", className: "w-full" })}>Show all posts</Link>
            )}
          </section>
        </>
      )}

      {tab === "about" && (
        <>
          <Panel className="p-4 sm:p-6">
            <h2 className="font-sans text-lg font-semibold tracking-normal">Overview</h2>
            {org.mission && <p className="story mt-2">{org.mission}</p>}
            <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
              {org.website && (
                <>
                  <dt className="font-semibold">Website</dt>
                  <dd><a href={org.website} target="_blank" rel="noopener noreferrer" className="text-leaf hover:underline">{host(org.website)}</a></dd>
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
          <Feed posts={posts} empty={`${org.name} hasn't posted yet.`} movedIds={movedIds} signedIn={signedIn} grantsByPost={grantsByPost} />
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
            <h2 className="font-sans text-lg font-semibold tracking-normal">Portfolio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Grant reports from the nonprofits {org.name} funds: what each grant made possible, in the grantee&apos;s own words.</p>
          </Panel>
          <Feed posts={portfolio} empty="No grant reports yet. They appear here when grantees post them." movedIds={movedIds} signedIn={signedIn} grantsByPost={grantsByPost} />
        </>
      )}
    </TwoColumn>
  )
}

function GiftsFund({ org }: { org: Org }) {
  if (!org.what_gifts_fund) return null
  return (
    <Panel className="border-marigold/40 bg-marigold-soft p-4 sm:p-6">
      <h2 className="font-sans text-lg font-semibold tracking-normal">What your gift funds</h2>
      <p className="story mt-2">{org.what_gifts_fund}</p>
    </Panel>
  )
}

// Every figure is footnoted to its source: imnet's no-fabrication promise, made visible.
function ImpactLedger({ stats }: { stats: ImpactStat[] }) {
  if (stats.length === 0) return null
  const { sources, marks } = footnotes(stats)
  return (
    <Panel aria-labelledby="impact" className="p-4 sm:p-6">
      <h2 id="impact" className="font-sans text-lg font-semibold tracking-normal">Impact so far</h2>
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
    <Link href="?tab=about" className="mt-3 flex w-fit items-center gap-2.5 rounded-full border bg-card py-1 pr-3 pl-1 text-sm hover:bg-muted">
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

