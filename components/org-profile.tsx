import Link from "next/link"
import { DonateButton } from "@/components/donate-button"
import { FollowButton } from "@/components/follow-button"
import { OrgMark } from "@/components/org-mark"
import { Feed } from "@/components/post-card"
import { ShareButton } from "@/components/share-button"
import { TrackView } from "@/components/track-view"
import { buttonVariants } from "@/components/ui/button"
import { footnotes } from "@/lib/footnotes"
import type { Cause, ImpactStat, Org, Post } from "@/lib/types"

const longDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

type Props = {
  org: Org
  stats: ImpactStat[]
  causes: Cause[]
  followers: number
  posts: Post[]
  signedIn: boolean
  following: boolean
}

export function OrgProfile({ org, stats, causes, followers, posts, signedIn, following }: Props) {
  const { sources, marks } = footnotes(stats)

  return (
    <div className="space-y-12">
      <TrackView orgId={org.id} />

      <section className="space-y-5">
        <OrgMark org={org} size="lg" />
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold sm:text-5xl">{org.name}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{followers} {followers === 1 ? "follower" : "followers"}</span>
            {org.ein && <span>EIN {org.ein}</span>}
            {org.website && (
              <a href={org.website} className="text-leaf underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                {new URL(org.website).hostname.replace(/^www\./, "")}
              </a>
            )}
          </p>
        </div>
        {org.mission && <p className="story text-xl leading-relaxed">{org.mission}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {signedIn ? (
            <FollowButton orgId={org.id} slug={org.slug} following={following} />
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>Sign in to follow</Link>
          )}
          {org.everyorg_slug && <DonateButton orgId={org.id} everyorgSlug={org.everyorg_slug} />}
          <ShareButton path={`/o/${org.slug}`} title={org.name} orgId={org.id} />
        </div>
        {causes.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {causes.map((c) => (
              <li key={c.slug}>
                <Link href={`/?cause=${c.slug}`} className="rounded-full bg-muted px-3 py-1 hover:bg-secondary">{c.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {org.what_gifts_fund && (
        <section className="rounded-3xl bg-marigold-soft px-6 py-5">
          <h2 className="text-xl font-semibold">What your gift funds</h2>
          <p className="story mt-2">{org.what_gifts_fund}</p>
        </section>
      )}

      {stats.length > 0 && (
        <section aria-labelledby="impact" className="space-y-4">
          <h2 id="impact" className="text-2xl font-semibold">Impact so far</h2>
          <dl className="divide-y border-y">
            {stats.map((s, i) => (
              <div key={s.id} className="flex items-baseline justify-between gap-6 py-4">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-heading text-3xl font-semibold tabular-nums">
                  {s.value}
                  <sup className="ml-0.5 align-super text-sm font-sans font-medium">
                    <a href={`#source-${marks[i]}`} className="text-leaf" aria-label={`Source ${marks[i]}`}>{marks[i]}</a>
                  </sup>
                </dd>
              </div>
            ))}
          </dl>
          <ol className="space-y-1 text-sm text-muted-foreground">
            {sources.map((src, i) => (
              <li key={src.url} id={`source-${i + 1}`} className="flex gap-2 scroll-mt-20">
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
        </section>
      )}

      <section aria-labelledby="stories" className="space-y-2">
        <h2 id="stories" className="text-2xl font-semibold">Stories and updates</h2>
        <Feed posts={posts} empty={`${org.name} hasn't posted yet.`} hideOrg />
      </section>
    </div>
  )
}
