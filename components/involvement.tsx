import { CalendarDays, Check, Gift, HandHelping, MessageSquareHeart, Plus, UserPlus } from "lucide-react"
import Link from "@/components/intent-link"
import { experienceVerb } from "@/lib/experience-text"
import type { Experience, Involvement } from "@/lib/queries"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DonateDialog } from "./donate-dialog"
import { ExperienceForm } from "./experience-form"
import { FollowButton } from "./follow-button"
import { LocalTime } from "./local-time"
import { PersonAvatar } from "./person-avatar"
import { Panel } from "./shell"
import { ToggleSignal } from "./toggle-signal"


// F-112: every way in, easiest first, so giving isn't the only door ("all-in giving"). Each step
// shows a check once you've done it. Steps without anything to do right now are left out.
export function InvolvementPath({ org, inv, signedIn, giftFunds }: { org: OrgSummary & { id: string; slug: string }; inv: Involvement; signedIn: boolean; giftFunds?: string | null }) {
  const steps: { key: string; done: boolean; Icon: typeof Plus; title: string; detail: React.ReactNode; action: React.ReactNode }[] = [
    {
      key: "follow", done: inv.following, Icon: UserPlus, title: "Follow", detail: "See their stories in your feed",
      action: signedIn ? <FollowButton orgId={org.id} orgName={org.name} following={inv.following} variant="icon" /> : <Link href="/login" className="text-sm font-semibold text-leaf hover:underline">Sign in</Link>,
    },
    ...(inv.event ? [{
      key: "attend", done: inv.event.going, Icon: CalendarDays, title: "Come to an event",
      detail: <><Link href={`/e/${inv.event.id}`} className="font-medium text-foreground hover:underline">{inv.event.title}</Link>, <LocalTime iso={inv.event.starts_at} format="day_short" /></>,
      action: <ToggleSignal kind="rsvp" id={inv.event.id} on={inv.event.going} signedIn={signedIn} label={`to ${inv.event.title}`} size="sm" />,
    }] : []),
    ...(inv.volunteer ? [{
      key: "volunteer", done: inv.volunteer.logged, Icon: HandHelping, title: "Volunteer",
      detail: <Link href={inv.volunteer.href} className="hover:underline">{inv.volunteer.title}</Link>,
      action: <Link href={inv.volunteer.href} className="rounded-full border px-2.5 py-0.5 text-xs font-semibold hover:bg-muted">See how</Link>,
    }] : []),
    {
      key: "give", done: inv.gave, Icon: Gift, title: "Give", detail: "Any amount, in test mode",
      action: <DonateDialog org={org} signedIn={signedIn} giftFunds={giftFunds} size="xs" className="[&_svg]:hidden" />,
    },
    {
      key: "share", done: inv.shared.length > 0, Icon: MessageSquareHeart, title: "Share your experience", detail: "Tell people who follow you how it went",
      action: signedIn ? <ExperienceForm orgId={org.id} slug={org.slug} orgName={org.name} /> : null,
    },
  ]
  const done = steps.filter((s) => s.done).length
  return (
    <Panel aria-labelledby="get-involved" className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="get-involved" className="h-section">Ways to get involved</h2>
        {signedIn && done > 0 && <p className="text-xs text-faint">{done} of {steps.length} done</p>}
      </div>
      <ol className="mt-3 space-y-0">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {/* The line that joins the steps. */}
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute top-8 bottom-0 left-[15px] w-0.5", s.done ? "bg-leaf/40" : "bg-border")} />}
            <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", s.done ? "bg-leaf text-white" : "bg-muted text-muted-foreground")}>
              {s.done ? <Check className="size-4" aria-label="Done" /> : <s.Icon className="size-4" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn("text-sm font-semibold", s.done && "text-muted-foreground")}>{s.title}</p>
              <p className="truncate text-sm text-muted-foreground">{s.detail}</p>
            </div>
            <div className="shrink-0 pt-0.5">{s.action}</div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// F-111: what people you follow say about this org. Only you and their other followers see it.
export function FriendsExperiences({ experiences, viewerId, slug }: { experiences: Experience[]; viewerId: string | null; slug: string }) {
  const others = experiences.filter((e) => e.person.id !== viewerId)
  const mine = experiences.filter((e) => e.person.id === viewerId)
  if (others.length === 0 && mine.length === 0) return null
  const names = [...new Map(others.map((e) => [e.person.id, e.person.display_name ?? `@${e.person.handle}`])).values()]
  const headline = names.length === 0 ? "Your experience" : names.length === 1 ? `${names[0]} has been here` : `${names[0]} and ${names.length - 1} ${names.length === 2 ? "other" : "others"} you follow have been here`
  return (
    <Panel aria-labelledby="friends-been" className="p-4 sm:p-5">
      <h2 id="friends-been" className="h-section">{headline}</h2>
      <p className="text-xs text-faint">Only you and the people who follow them see these</p>
      <ul className="mt-3 space-y-3">
        {[...others, ...mine].map((e) => {
          const name = e.person.id === viewerId ? "You" : (e.person.display_name ?? `@${e.person.handle}`)
          return (
            <li key={e.id} className="flex gap-3">
              <PersonAvatar name={name} avatarUrl={e.person.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/u/${e.person.handle}`} className="font-semibold hover:underline">{name}</Link>{" "}
                  <span className="text-muted-foreground">{experienceVerb(e).replace(/ (at|to)$/, " here")}</span>
                </p>
                {e.note && <p className="story mt-1 rounded-lg bg-muted px-3 py-2 text-[0.95rem] leading-snug">&ldquo;{e.note}&rdquo;</p>}
              </div>
            </li>
          )
        })}
      </ul>
      {mine.length > 0 && <p className="mt-3 text-xs text-faint">Shared with people who follow you · <Link href={`/o/${slug}#get-involved`} className="hover:underline">Edit</Link></p>}
    </Panel>
  )
}
