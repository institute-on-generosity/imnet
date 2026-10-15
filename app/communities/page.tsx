import { Plus } from "lucide-react"
import Link from "@/components/intent-link"
import { CauseFilter } from "@/components/cause-filter"
import { CommunitiesNearYou } from "@/components/communities-near-you"
import { CONTAINER, Panel } from "@/components/shell"
import { buttonVariants } from "@/components/ui/button"
import { getCauses, getDiscoverGroups, getMapItems, getMyGroups, getPlacedCommunities, getProfileCity } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Communities" }

// F-100: communities around a cause, each with a members-only chat.
export default async function CommunitiesPage({ searchParams }: PageProps<"/communities">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const userId = await getUserId()
  const [mine, discover, causes, placed, profileCity, mapItems] = await Promise.all([
    userId ? getMyGroups(userId) : [], getDiscoverGroups(userId, active), getCauses(), getPlacedCommunities(userId), getProfileCity(userId), getMapItems(),
  ])
  const orgs = mapItems.filter((i) => i.kind === "nonprofit" || i.kind === "foundation")

  return (
    <div className={`${CONTAINER} space-y-3`}>
      <Panel className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div>
          <h1 className="h-page">Communities</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">People around a cause, each community with a chat for its members.</p>
        </div>
        <Link href={userId ? "/communities/new" : "/login?next=/communities/new"} className={buttonVariants({ variant: "outline" })}><Plus aria-hidden />Start a community</Link>
      </Panel>

      {/* F-102: near you first (list left, map right); your communities and Discover follow on the left. */}
      <CommunitiesNearYou communities={placed} profile={profileCity} causeNames={Object.fromEntries(causes.map((c) => [c.slug, c.name]))}
        orgs={orgs} mine={mine} discover={discover} discoverTitle={mine.length ? "Discover more" : "Discover communities"}
        filter={<CauseFilter causes={causes} active={active} basePath="/communities" hrefFor={(c) => (c ? `/communities?cause=${c}` : "/communities")} />} />
    </div>
  )
}

