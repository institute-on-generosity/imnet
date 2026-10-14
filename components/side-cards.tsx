import { Bookmark, NotebookPen, Plus } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { OrgSummaryWithMission, Viewer } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { OrgMark } from "./org-mark"
import { IconTip } from "./icon-tip"
import { FoundationMark } from "./org-type-badge"
import { Panel } from "./shell"

// Left column: who you are on imnet.
export function ViewerCard({ viewer }: { viewer: Viewer }) {
  const name = viewer.display_name ?? `@${viewer.handle}`
  return (
    <Panel className="overflow-hidden">
      <div className="h-14 bg-leaf-soft" />
      <div className="-mt-8 px-4 pb-4">
        <span aria-hidden className="grid size-16 place-items-center rounded-full border-4 border-card bg-leaf font-heading text-2xl text-white">
          {name.replace("@", "").charAt(0).toUpperCase()}
        </span>
        <Link href={`/u/${viewer.handle}`} className="mt-2 block font-semibold hover:underline">{name}</Link>
        <p className="text-sm text-muted-foreground">@{viewer.handle}</p>
      </div>
      <dl className="space-y-1.5 border-t px-4 py-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Following</dt>
          <dd><Link href="/following" className="font-semibold text-leaf hover:underline">{viewer.following}</Link></dd>
        </div>
      </dl>
      <Link href="/saved" className="flex items-center gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
        <Bookmark className="size-4" aria-hidden /> Saved posts
      </Link>
      <Link href="/giving" className="flex items-center gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
        <NotebookPen className="size-4" aria-hidden /> Giving journal
      </Link>
      {viewer.causes.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">Causes you care about</p>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {viewer.causes.map((c) => (
              <li key={c.slug}><Link href={`/?cause=${c.slug}`} className="rounded-full bg-muted px-2.5 py-1 hover:bg-secondary">{c.name}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
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
      <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>
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
