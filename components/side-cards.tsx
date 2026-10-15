import { ArrowRight, Bookmark, CalendarDays, HandHelping, Megaphone, NotebookPen, Plus, Users, UsersRound } from "lucide-react"
import { personCoverSrc } from "@/lib/cover"
import { formatUsd } from "@/lib/grants"
import { hoursLabel } from "@/lib/volunteer"
import Link from "@/components/intent-link"
import { buttonVariants } from "@/components/ui/button"
import type { OrgSummaryWithMission, Viewer, ViewerExtras } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { OrgMark } from "./org-mark"
import { PersonAvatar } from "./person-avatar"
import { IconTip } from "./icon-tip"
import { FoundationMark } from "./org-type-badge"
import { Panel } from "./shell"

// Left column (F-087), LinkedIn-style: who you are, your own giving this year (private), the org
// you work for, and shortcuts.
export function ViewerCard({ viewer, extras }: { viewer: Viewer; extras: ViewerExtras }) {
  const name = viewer.display_name ?? `@${viewer.handle}`
  const cover = personCoverSrc(viewer.cover_url)
  const anchor = extras.org ?? extras.topSupported
  return (
    <div className="space-y-2">
      <Panel className="overflow-hidden">
        <Link href={`/u/${viewer.handle}`} tabIndex={-1} aria-hidden className="block h-16 bg-gradient-to-r from-leaf-soft to-marigold-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img src={cover} alt="" className="size-full object-cover" />}
        </Link>
        <div className="-mt-10 px-4 pb-4">
          <Link href={`/u/${viewer.handle}`} tabIndex={-1} aria-hidden className="inline-block">
            <PersonAvatar name={name} avatarUrl={viewer.avatar_url} size="xl" className="size-20 border-4 border-card bg-card sm:size-20" />
          </Link>
          <Link href={`/u/${viewer.handle}`} className="mt-1 block font-heading text-xl leading-tight font-semibold hover:underline">{name}</Link>
          {viewer.bio && <p className="mt-1 text-sm leading-snug">{viewer.bio}</p>}
          {viewer.location && <p className="mt-0.5 text-xs text-muted-foreground">{viewer.location}</p>}
          {anchor && (
            <Link href={`/o/${anchor.slug}`} className="mt-3 flex items-center gap-2 text-sm font-medium hover:underline">
              <OrgMark org={anchor} size="sm" /><span className="min-w-0 truncate">{anchor.name}</span>
            </Link>
          )}
        </div>
      </Panel>

      <Panel>
        <dl className="space-y-2 px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Given this year</dt>
            <dd><Link href="/giving" className="font-semibold text-leaf hover:underline">{formatUsd(extras.givenThisYear)}</Link></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Volunteer hours</dt>
            <dd><Link href="/giving#hours" className="font-semibold text-leaf hover:underline">{hoursLabel(extras.hoursThisYear).replace(/ hours?$/, "")}</Link></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Following</dt>
            <dd><Link href="/following" className="font-semibold text-leaf hover:underline">{viewer.following}</Link></dd>
          </div>
        </dl>
        <p className="border-t px-4 py-2 text-xs text-faint">Only you see these.</p>
      </Panel>

      {extras.org && (
        <Panel>
          <div className="px-4 pt-4">
            <OrgMark org={extras.org} size="md" />
            <Link href={`/o/${extras.org.slug}`} className="mt-2 block font-semibold hover:underline">{extras.org.name}</Link>
          </div>
          <dl className="space-y-1.5 px-4 py-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Followers</dt><dd className="font-semibold tabular-nums">{extras.org.followers.toLocaleString("en-US")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Views (30 days)</dt><dd className="font-semibold tabular-nums">{extras.org.views.toLocaleString("en-US")}</dd></div>
          </dl>
          <Link href={`/dashboard/${extras.org.id}`} className="flex items-center justify-between border-t px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            Go to dashboard<ArrowRight className="size-4" aria-hidden />
          </Link>
        </Panel>
      )}

      <Panel className="py-1.5">
        {[
          { href: "/saved", label: "Saved posts", Icon: Bookmark },
          { href: "/following", label: "Following", Icon: Users },
          { href: "/communities", label: "Communities", Icon: UsersRound },
          { href: "/events", label: "Events", Icon: CalendarDays },
          { href: "/needs", label: "Ways to help", Icon: HandHelping },
          { href: "/giving", label: "Giving journal", Icon: NotebookPen },
          { href: "/calls", label: "Open calls (grants)", Icon: Megaphone },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:bg-muted">
            <Icon className="size-4 text-muted-foreground" aria-hidden />{label}
          </Link>
        ))}
      </Panel>
    </div>
  )
}

// Left column when signed out.
export function JoinCard() {
  return (
    <Panel className="space-y-3 p-4">
      <p className="font-heading text-lg font-semibold leading-snug">Follow the nonprofits and foundations you care about</p>
      <p className="text-sm text-muted-foreground">Their stories, in one feed.</p>
      <Link href="/login" className={buttonVariants({ className: "w-full" })}>Join now</Link>
    </Panel>
  )
}

// Right column: organizations to follow. Alphabetical, never popularity-ranked.
export function SuggestedOrgs({ title, orgs, signedIn }: { title: string; orgs: OrgSummaryWithMission[]; signedIn: boolean }) {
  if (orgs.length === 0) return null
  return (
    <Panel className="p-4">
      <h2 className="h-rail">{title}</h2>
      <ul className="mt-3 space-y-3">
        {orgs.map((org) => (
          <li key={org.id} className="flex items-center gap-3">
            <OrgMark org={org} />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Link href={`/o/${org.slug}`} className="truncate text-sm font-medium hover:underline" title={org.mission ?? undefined}>{org.name}</Link>
              {org.org_type === "foundation" && <FoundationMark />}
            </div>
            {signedIn ? (
              <FollowButton orgId={org.id} orgName={org.name} following={false} variant="icon" />
            ) : (
              <IconTip label={`Follow ${org.name} (sign in)`}>
                <Link href="/login" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border hover:bg-muted"><Plus className="size-4" aria-hidden /></Link>
              </IconTip>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
