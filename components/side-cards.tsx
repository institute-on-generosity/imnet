import { Plus } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { OrgSummaryWithMission, Viewer } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { OrgMark } from "./org-mark"
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
      <dl className="border-t px-4 py-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Following</dt>
          <dd><Link href="/following" className="font-semibold text-leaf hover:underline">{viewer.following}</Link></dd>
        </div>
      </dl>
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
      <p className="font-heading text-lg font-semibold leading-snug">Follow the nonprofits you care about</p>
      <p className="text-sm text-muted-foreground">See their stories in one feed, and share the ones that move you.</p>
      <Link href="/login" className={buttonVariants({ className: "w-full" })}>Join now</Link>
    </Panel>
  )
}

// Right column: orgs to follow. Alphabetical, never popularity-ranked.
export function SuggestedOrgs({ title, orgs, signedIn }: { title: string; orgs: OrgSummaryWithMission[]; signedIn: boolean }) {
  if (orgs.length === 0) return null
  return (
    <Panel className="p-4">
      <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>
      <ul className="mt-3 space-y-4">
        {orgs.map((org) => (
          <li key={org.id} className="flex gap-3">
            <OrgMark org={org} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Link href={`/o/${org.slug}`} className="block truncate font-medium hover:underline">{org.name}</Link>
              {org.mission && <p className="line-clamp-2 text-xs text-muted-foreground">{org.mission}</p>}
              {signedIn ? (
                <FollowButton orgId={org.id} slug={org.slug} following={false} compact />
              ) : (
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}><Plus aria-hidden />Follow</Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
