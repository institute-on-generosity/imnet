import { Panel, TwoColumn } from "@/components/shell"
import { NotableGiverCard } from "@/components/notable"
import { CommunityGrid } from "@/components/community-card"
import { getFollowedPersonIds, getNotableGivers } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Notable givers" }

// F-113: follow public figures and see who they give to. Public figures are verified by imnet and
// choose what to share; nothing here is compiled about anyone without their say.
export default async function GiversPage() {
  const userId = await getUserId()
  const [givers, followed] = await Promise.all([getNotableGivers(), userId ? getFollowedPersonIds(userId) : Promise.resolve([])])
  const following = new Set(followed)
  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">Public figures join imnet themselves and are verified by our team. They choose whether to show who they give to.</Panel>}>
      <Panel className="p-4">
        <h1 className="h-page">Notable givers</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Follow public figures and see who they give to</p>
      </Panel>
      {givers.length === 0 ? (
        <Panel className="p-6 text-sm text-muted-foreground">No public figures yet</Panel>
      ) : (
        <Panel className="overflow-hidden">
          <CommunityGrid>
            {givers.map((g) => <li key={g.id}><NotableGiverCard giver={g} following={following.has(g.id)} signedIn={!!userId} /></li>)}
          </CommunityGrid>
        </Panel>
      )}
    </TwoColumn>
  )
}
