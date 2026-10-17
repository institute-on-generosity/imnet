import { Check } from "lucide-react"
import { redirect } from "next/navigation"
import { finishWelcome, joinGroup, saveWelcomeCauses, saveWelcomeCity } from "@/app/actions"
import { CommunityMark } from "@/components/community-mark"
import { FollowButton } from "@/components/follow-button"
import Link from "@/components/intent-link"
import { OrgMark } from "@/components/org-mark"
import { PersonAvatar } from "@/components/person-avatar"
import { Panel } from "@/components/shell"
import { Button } from "@/components/ui/button"
import { CAUSE_ICON } from "@/lib/cause-icons"
import { formatMiles, milesBetween } from "@/lib/geo"
import { getCauses, getFollowedPersonIds, getNotableGivers, getOrgsInCauses, getPlacedCommunities, getProfileCity } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata = { title: "Welcome" }
const STEPS = ["Your causes", "Where you are", "Follow a few"]

// F-124: three short steps so a new account starts with a Home worth coming back to.
export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/welcome")
  const { step: raw } = await searchParams
  const step = raw === "2" ? 2 : raw === "3" ? 3 : 1
  const supabase = await createClient()
  const [causes, { data: mine }, { data: me }] = await Promise.all([
    getCauses(), supabase.from("profile_causes").select("cause_slug").eq("user_id", userId), supabase.from("profiles").select("location").eq("id", userId).single(),
  ])
  const picked = new Set((mine ?? []).map((c) => c.cause_slug))

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 sm:px-6">
      <div>
        <h1 className="h-page">Welcome to imnet</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Three quick steps to fill your Home with people and causes you care about</p>
      </div>
      <ol className="flex gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined} className={cn("flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", step === i + 1 ? "border-leaf bg-leaf-soft text-leaf" : step > i + 1 ? "text-leaf" : "text-faint")}>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[11px]", step > i + 1 ? "bg-leaf text-white" : step === i + 1 ? "bg-leaf text-white" : "bg-muted")}>{step > i + 1 ? <Check className="size-3" aria-hidden /> : i + 1}</span>
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Panel className="p-5">
          <h2 className="h-section">What do you care about?</h2>
          <p className="text-sm text-muted-foreground">Pick a few. They shape your suggestions; you can change them any time</p>
          <form action={saveWelcomeCauses} className="mt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {causes.map((c) => {
                const Icon = CAUSE_ICON[c.slug] ?? Check
                return (
                  <label key={c.slug} className="flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-medium has-checked:border-leaf has-checked:bg-leaf-soft has-checked:text-leaf has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
                    <input type="checkbox" name="causes" value={c.slug} defaultChecked={picked.has(c.slug)} className="sr-only" />
                    <Icon className="size-5 shrink-0" aria-hidden />{c.name}
                  </label>
                )
              })}
            </div>
            <div className="mt-5 flex items-center justify-between">
              {/* A second action on the same form (no nested forms). */}
              <button type="submit" formAction={finishWelcome} className="text-sm text-muted-foreground hover:text-foreground hover:underline">Skip for now</button>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        </Panel>
      )}

      {step === 2 && <CityStep current={me?.location ?? ""} />}
      {step === 3 && <FollowStep userId={userId} causes={[...picked]} />}
    </div>
  )
}

async function CityStep({ current }: { current: string }) {
  const supabase = await createClient()
  const { data: cities } = await supabase.from("cities").select("name").order("name")
  return (
    <Panel className="p-5">
      <h2 className="h-section">Where are you?</h2>
      <p className="text-sm text-muted-foreground">So we can show communities, events and ways to help near you. Shown on your profile</p>
      <form action={saveWelcomeCity} className="mt-4">
        <label htmlFor="welcome-city" className="text-sm font-medium">City</label>
        <input id="welcome-city" name="location" list="welcome-cities" defaultValue={current} placeholder="Mountain View, CA" autoComplete="address-level2"
          className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        <datalist id="welcome-cities">{(cities ?? []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
        <div className="mt-5 flex items-center justify-between">
          <Link href="/welcome?step=1" className="text-sm text-muted-foreground hover:underline">Back</Link>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Panel>
  )
}

async function FollowStep({ userId, causes }: { userId: string; causes: string[] }) {
  const [city, placed, orgs, notable, followed] = await Promise.all([getProfileCity(userId), getPlacedCommunities(userId), getOrgsInCauses(causes, [], 6), getNotableGivers(), getFollowedPersonIds(userId)])
  const communities = city ? placed.map((c) => ({ ...c, miles: milesBetween(city.at, c) })).sort((a, b) => a.miles - b.miles).slice(0, 4) : placed.slice(0, 4).map((c) => ({ ...c, miles: null as number | null }))
  const following = new Set(followed)
  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <h2 className="h-section">Communities {city ? "near you" : "to join"}</h2>
        <ul className="mt-3 divide-y">
          {communities.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <CommunityMark cause={c.cause_slug} icon={c.icon_path} size="sm" className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[c.location, c.miles !== null ? formatMiles(c.miles) : null, `${c.members} members`].filter(Boolean).join(" · ")}</p>
              </div>
              {c.joined ? <span className="text-xs font-semibold text-leaf">Joined</span> : (
                <form action={joinGroup.bind(null, c.id, c.slug)}><Button type="submit" size="sm" variant="outline">Join</Button></form>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      {orgs.length > 0 && (
        <Panel className="p-5">
          <h2 className="h-section">Organizations in your causes</h2>
          <ul className="mt-3 divide-y">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <OrgMark org={o} size="md" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{o.name}</p>{o.mission && <p className="line-clamp-1 text-xs text-muted-foreground">{o.mission}</p>}</div>
                <FollowButton orgId={o.id} orgName={o.name} following={false} variant="icon" />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {notable.length > 0 && (
        <Panel className="p-5">
          <h2 className="h-section">Notable givers</h2>
          <ul className="mt-3 divide-y">
            {notable.slice(0, 4).map((g) => {
              const name = g.display_name ?? `@${g.handle}`
              return (
                <li key={g.id} className="flex items-center gap-3 py-2.5">
                  <PersonAvatar name={name} avatarUrl={g.avatar_url} size="md" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-muted-foreground">{g.public_figure_note}{g.givesTo[0] ? ` · gives to ${g.givesTo[0].name}` : ""}</p></div>
                  <FollowButton orgId={g.id} orgName={name} following={following.has(g.id)} variant="icon" person />
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      <div className="flex items-center justify-between">
        <Link href="/welcome?step=2" className="text-sm text-muted-foreground hover:underline">Back</Link>
        <form action={finishWelcome}><Button type="submit">Finish and go to Home</Button></form>
      </div>
      <p className="text-center text-xs text-faint">You can change all of this later in Discover and Edit profile</p>
    </div>
  )
}
