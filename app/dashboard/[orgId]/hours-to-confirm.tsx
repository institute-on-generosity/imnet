import { Check, X } from "lucide-react"
import { reviewHours } from "@/app/actions"
import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HoursToConfirm } from "@/lib/queries"
import { hoursLabel } from "@/lib/volunteer"

const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Volunteers log shifts with you; confirm the ones you recognize so they show as confirmed.
export function HoursToConfirmCard({ orgId, hours }: { orgId: string; hours: HoursToConfirm[] }) {
  if (hours.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle>Volunteer hours to confirm</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Confirmed hours show a check on the volunteer&apos;s profile</p>
        <ul className="divide-y rounded-lg border">
          {hours.map((h) => {
            const name = h.person.display_name ?? `@${h.person.handle}`
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <PersonAvatar name={name} avatarUrl={h.person.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${h.person.handle}`} className="font-medium hover:underline">{name}</Link>
                  <p className="text-muted-foreground">{hoursLabel(h.hours)} on {day(h.served_on)}{h.note && `: ${h.note}`}</p>
                </div>
                <form action={reviewHours.bind(null, h.id, orgId, true)}>
                  <Button type="submit" size="sm"><Check aria-hidden />Confirm<span className="sr-only"> {hoursLabel(h.hours)} from {name}</span></Button>
                </form>
                <form action={reviewHours.bind(null, h.id, orgId, false)}>
                  <Button type="submit" size="sm" variant="outline"><X aria-hidden />Not ours<span className="sr-only">: {hoursLabel(h.hours)} from {name}</span></Button>
                </form>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
