import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import type { OrgDonations } from "@/lib/queries"

const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// F-099: gifts made on imnet (test mode). Totals for the last 30 days, then the newest gifts;
// donors who chose anonymous show as "Anonymous".
export function DonationsCard({ donations: { list: donations, total30: total, count30, monthlyDonors: monthly } }: { donations: OrgDonations }) {
  if (donations.length === 0) return <p className="text-sm text-muted-foreground">No gifts on imnet yet. Donors give from your profile and your donation calls.</p>
  return (
    <div>
      <dl className="grid grid-cols-3 gap-3">
        <div><dt className="text-xs text-muted-foreground">Last 30 days</dt><dd className="font-heading text-2xl font-semibold">{money(total)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Gifts (30d)</dt><dd className="font-heading text-2xl font-semibold">{count30}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Monthly donors</dt><dd className="font-heading text-2xl font-semibold">{monthly}</dd></div>
      </dl>
      <ul className="mt-4 divide-y border-t">
        {donations.slice(0, 8).map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
            <PersonAvatar name={d.donor_name ?? "Anonymous"} avatarUrl={d.donor_avatar} size="sm" />
            <span className="min-w-0 flex-1 truncate">
              {d.donor_handle ? <Link href={`/u/${d.donor_handle}`} className="font-medium hover:underline">{d.donor_name}</Link> : <span className="text-muted-foreground">Anonymous</span>}
              {d.monthly && <span className="ml-2 rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-medium text-leaf">Monthly</span>}
            </span>
            <span className="font-semibold">{money(d.amount_cents)}</span>
            <span className="w-14 text-right text-xs text-faint">{day(d.created_at)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-faint">Test mode: no real money moved.</p>
    </div>
  )
}
