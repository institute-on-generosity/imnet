import { BadgeCheck, Building2, HandCoins, Landmark, Sparkles, Star, UserRound } from "lucide-react"
import { Panel, TwoColumn } from "@/components/shell"

export const metadata = { title: "What Verified means" }

const CHECKED = [
  {
    Icon: Building2, title: "Verified nonprofit or foundation",
    body: "Someone from the organization claimed it with its EIN and a work email at its own domain. Our team checks both before the profile goes live. When IRS records match the EIN, name and status, the profile says so.",
  },
  {
    Icon: Landmark, title: "Confirmed grants",
    body: "A foundation lists a grant; it only shows publicly once the nonprofit's staff confirm they received it. Totals on a foundation's profile count confirmed grants only.",
  },
  {
    Icon: Star, title: "Public figure",
    body: "A known person who joined imnet themselves. Our team confirms it's really them. They choose whether to show who they give to.",
  },
]

const SELF = [
  { Icon: HandCoins, title: "Gifts, hours and “Donor”", body: "What people log or share about their own giving and volunteering. We don't check receipts." },
  { Icon: UserRound, title: "Profiles", body: "Names, bios and cities are what people write about themselves" },
  { Icon: Sparkles, title: "AI-assisted media", body: "Posters mark photos or videos made or changed with AI. The label shows on the post." },
]

// F-126: plain answers about what each trust mark on imnet does and doesn't mean.
export default function VerifiedPage() {
  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">See something that isn&apos;t right? Use Report on the post, profile or conversation and our team will look at it.</Panel>}>
      <Panel className="p-4 sm:p-6">
        <h1 className="flex items-center gap-2 h-page"><BadgeCheck className="size-7 text-leaf" aria-hidden />What Verified means</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Verified means we checked who is behind an account. It isn&apos;t a rating of how well an organization uses money, and it isn&apos;t an endorsement.
        </p>
      </Panel>
      <Panel aria-labelledby="we-check" className="p-4 sm:p-6">
        <h2 id="we-check" className="h-section">What our team checks</h2>
        <ul className="mt-3 space-y-4">
          {CHECKED.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf"><Icon className="size-4" aria-hidden /></span>
              <div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{body}</p></div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel aria-labelledby="self-reported" className="p-4 sm:p-6">
        <h2 id="self-reported" className="h-section">What people share themselves</h2>
        <ul className="mt-3 space-y-4">
          {SELF.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-4" aria-hidden /></span>
              <div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{body}</p></div>
            </li>
          ))}
        </ul>
      </Panel>
    </TwoColumn>
  )
}
