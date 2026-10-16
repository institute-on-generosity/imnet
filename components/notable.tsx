import { BadgeCheck } from "lucide-react"
import Link from "@/components/intent-link"
import { experienceVerb } from "@/lib/experience-text"
import type { NotableGiver, PersonExperience } from "@/lib/queries"
import { FollowButton } from "./follow-button"
import { OrgMark } from "./org-mark"
import { PersonAvatar } from "./person-avatar"
import { Panel } from "./shell"

// F-113: an admin-verified public figure.
export function PublicFigureBadge({ note }: { note?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-marigold-soft px-2.5 py-0.5 font-sans text-xs font-semibold tracking-normal text-amber-900" title="Verified public figure">
      <BadgeCheck className="size-3.5" aria-hidden />Public figure{note ? ` · ${note}` : ""}
    </span>
  )
}

// F-113: one notable giver: who they are and who they give to (only what they chose to share).
export function NotableGiverCard({ giver, following, signedIn }: { giver: NotableGiver; following: boolean; signedIn: boolean }) {
  const name = giver.display_name ?? `@${giver.handle}`
  return (
    <div className="flex h-full flex-col bg-card p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${giver.handle}`} tabIndex={-1} aria-hidden><PersonAvatar name={name} avatarUrl={giver.avatar_url} size="lg" /></Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${giver.handle}`} className="block truncate font-semibold hover:underline">{name}</Link>
          {giver.public_figure_note && <p className="flex items-center gap-1 text-xs font-semibold text-amber-800"><BadgeCheck className="size-3.5" aria-hidden />{giver.public_figure_note}</p>}
          {giver.bio && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{giver.bio}</p>}
        </div>
        {signedIn && <FollowButton orgId={giver.id} orgName={name} following={following} person variant="icon" />}
      </div>
      <div className="mt-3 border-t pt-3">
        {giver.givesTo.length > 0 ? (
          <>
            <p className="text-xs text-faint">Gives to</p>
            <ul className="mt-1.5 space-y-1.5">
              {giver.givesTo.map((o) => (
                <li key={o.id}><Link href={`/o/${o.slug}`} className="flex items-center gap-2 text-sm hover:underline"><OrgMark org={o} size="xs" /><span className="truncate">{o.name}</span></Link></li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-faint">Keeps their giving private</p>
        )}
      </div>
    </div>
  )
}


// F-111: a person's experiences, shown to them and the people who follow them.
export function PersonExperiences({ items, isOwn, name }: { items: PersonExperience[]; isOwn: boolean; name: string }) {
  if (items.length === 0) return null
  return (
    <Panel aria-labelledby="experiences" className="p-4 sm:p-6">
      <h2 id="experiences" className="h-section">Experiences</h2>
      <p className="text-xs text-faint">{isOwn ? "Only people who follow you see these" : `Shared with people who follow ${name}`}</p>
      <ul className="mt-3 space-y-3">
        {items.map((e) => (
          <li key={e.id} className="flex gap-3">
            <OrgMark org={e.org} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="text-muted-foreground">{(() => { const v = experienceVerb(e); return v.charAt(0).toUpperCase() + v.slice(1) })()}</span> <Link href={`/o/${e.org.slug}`} className="font-semibold hover:underline">{e.org.name}</Link></p>
              {e.note && <p className="story mt-1 text-[0.95rem] leading-snug">&ldquo;{e.note}&rdquo;</p>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
