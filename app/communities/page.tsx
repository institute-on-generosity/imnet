import { Plus } from "lucide-react"
import Link from "@/components/intent-link"
import { CauseFilter } from "@/components/cause-filter"
import { CommunityMark } from "@/components/community-mark"
import { CommunitiesNearYou } from "@/components/communities-near-you"
import { CONTAINER, Panel } from "@/components/shell"
import { buttonVariants } from "@/components/ui/button"
import { getCauses, getDiscoverGroups, getMyGroups, getPlacedCommunities, getProfileCity, type GroupCard } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata = { title: "Communities" }

const members = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "member" : "members"}`

// F-100: communities around a cause, each with a members-only chat.
export default async function GroupsPage({ searchParams }: PageProps<"/communities">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const userId = await getUserId()
  const [mine, discover, causes, placed, profileCity] = await Promise.all([
    userId ? getMyGroups(userId) : [], getDiscoverGroups(userId, active), getCauses(), getPlacedCommunities(userId), getProfileCity(userId),
  ])
  const causeName = new Map(causes.map((c) => [c.slug, c.name]))

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
      <CommunitiesNearYou communities={placed} profile={profileCity} causeNames={Object.fromEntries(causes.map((c) => [c.slug, c.name]))}>
        {mine.length > 0 && (
          <Panel aria-labelledby="your-communities">
            <h2 id="your-communities" className="h-section border-b px-4 py-3">Your communities</h2>
            <ul className="divide-y">{mine.map((g) => <GroupRow key={g.id} g={g} cause={g.cause_slug ? causeName.get(g.cause_slug) : undefined} />)}</ul>
          </Panel>
        )}

        <Panel aria-labelledby="discover">
          <div className="space-y-3 border-b px-4 py-3">
            <h2 id="discover" className="h-section">{mine.length ? "Discover more" : "Discover communities"}</h2>
            <CauseFilter causes={causes} active={active} basePath="/communities" hrefFor={(c) => (c ? `/communities?cause=${c}` : "/communities")} />
          </div>
          {discover.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No communities here yet. Start the first one.</p>
          ) : (
            <ul className="divide-y">{discover.map((g) => <GroupRow key={g.id} g={g} cause={g.cause_slug ? causeName.get(g.cause_slug) : undefined} />)}</ul>
          )}
        </Panel>
      </CommunitiesNearYou>
    </div>
  )
}

function GroupRow({ g, cause }: { g: GroupCard; cause?: string }) {
  return (
    <li>
      <Link href={`/communities/${g.slug}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
        <CommunityMark cause={g.cause_slug} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate", g.unread ? "font-bold" : "font-semibold")}>{g.name}</p>
          {g.description && <p className="line-clamp-2 text-sm text-muted-foreground">{g.description}</p>}
          <p className="mt-0.5 text-xs text-faint">{[cause, members(g.members)].filter(Boolean).join(" · ")}</p>
        </div>
        {g.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-leaf" aria-label="New messages" />}
      </Link>
    </li>
  )
}
