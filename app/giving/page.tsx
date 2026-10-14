import Link from "@/components/intent-link"
import { redirect } from "next/navigation"
import { Panel, TwoColumn } from "@/components/shell"
import { summarize } from "@/lib/gifts"
import { formatUsd } from "@/lib/grants"
import { getFollowedOrgs, getGifts, getOrgName, getSinceYourGifts } from "@/lib/queries"
import { todayISO } from "@/lib/open-calls"
import { createClient, getUserId } from "@/lib/supabase/server"
import { DonorBadgeToggle } from "./donor-badge-toggle"
import { DeleteGift, GiftForm } from "./gift-form"
import { SinceYourGifts } from "./since-your-gifts"

export const metadata = { title: "Giving journal" }

const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

// Private record of what you gave. Nobody else sees it, including the orgs.
export default async function GivingPage({ searchParams }: PageProps<"/giving">) {
  const { org } = await searchParams
  const userId = await getUserId()
  if (!userId) redirect(`/login?next=${encodeURIComponent(typeof org === "string" ? `/giving?org=${org}` : "/giving")}`)
  const [gifts, followed, preselect] = await Promise.all([getGifts(userId), getFollowedOrgs(userId), typeof org === "string" ? getOrgName(org) : null])
  // Coming from a Donate click: offer that org even if you don't follow it.
  const orgs = preselect && !followed.some((o) => o.id === preselect.id) ? [preselect, ...followed] : followed
  const years = summarize(gifts)
  const supabase = await createClient()
  const [since, { data: profile }] = await Promise.all([getSinceYourGifts(gifts), supabase.from("profiles").select("donor_badge").eq("id", userId).single()])

  return (
    <TwoColumn>
      <Panel className="p-4">
        <h1 className="font-sans text-lg font-semibold tracking-normal">Giving journal</h1>
        <p className="text-sm text-muted-foreground">Only you see this. Handy at tax time.</p>
        <div className="mt-3 border-t pt-3"><DonorBadgeToggle on={!!profile?.donor_badge} /></div>
      </Panel>

      <Panel className="p-4">
        <h2 className="mb-3 font-semibold">Log a gift</h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Follow an organization to log gifts to it. <Link href="/" className="text-leaf underline">Explore</Link></p>
        ) : (
          <GiftForm orgs={orgs} today={todayISO()} preselect={preselect?.id} />
        )}
      </Panel>

      <SinceYourGifts posts={since} />

      {years.map((y) => (
        <Panel key={y.year} aria-labelledby={`y-${y.year}`} className="p-4">
          <div className="flex items-baseline justify-between">
            <h2 id={`y-${y.year}`} className="font-semibold">{y.year}</h2>
            <p className="font-heading text-2xl font-semibold tabular-nums">{formatUsd(y.total)}</p>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {y.orgs.map((o) => (
              <li key={o.slug} className="flex justify-between gap-4">
                <Link href={`/o/${o.slug}`} className="truncate hover:underline">{o.name}</Link>
                <span className="tabular-nums text-muted-foreground">{formatUsd(o.total)}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 divide-y border-t text-sm">
            {gifts.filter((g) => g.given_on.startsWith(y.year)).map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2">
                <span className="w-24 shrink-0 text-muted-foreground">{day(g.given_on)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {g.org.name}
                  {g.note && <span className="text-muted-foreground">: {g.note}</span>}
                </span>
                <span className="tabular-nums">{formatUsd(g.amount_usd)}</span>
                <DeleteGift id={g.id} label={`${formatUsd(g.amount_usd)} to ${g.org.name}`} />
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </TwoColumn>
  )
}
