import { CauseFilter } from "@/components/cause-filter"
import { NeedRow } from "@/components/needs-panel"
import { Panel, TwoColumn } from "@/components/shell"
import { getCauses, getMyInterestIds, getOpenNeeds } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Ways to help" }

// Concrete asks from verified orgs: items, volunteers, funding. Newest first; you help on their terms.
export default async function NeedsPage({ searchParams }: PageProps<"/needs">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const userId = await getUserId()
  const [needs, causes] = await Promise.all([getOpenNeeds({ cause: active }), getCauses()])
  const interestIds = await getMyInterestIds(userId, needs.map((n) => n.id))

  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">Each org says how to help. &quot;I&apos;m interested&quot; tells only their team.</Panel>}>
      <Panel className="space-y-3 p-4">
        <div>
          <h1 className="font-sans text-lg font-semibold tracking-normal">Ways to help</h1>
          <p className="text-sm text-muted-foreground">What organizations need right now. Newest first.</p>
        </div>
        <CauseFilter causes={causes} active={active} basePath="/needs" />
      </Panel>
      <Panel className="px-4">
        {needs.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{active ? "No open needs for this cause. Try all causes." : "No open needs right now."}</p>
        ) : (
          <ul className="divide-y">{needs.map((n) => <NeedRow key={n.id} need={n} interested={interestIds.has(n.id)} signedIn={!!userId} />)}</ul>
        )}
      </Panel>
    </TwoColumn>
  )
}
