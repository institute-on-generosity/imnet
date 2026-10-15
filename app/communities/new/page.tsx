import { redirect } from "next/navigation"
import { Panel, TwoColumn } from "@/components/shell"
import { getCauses } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"
import { NewCommunityForm } from "./new-community-form"

export const metadata = { title: "Start a community" }

export default async function NewGroupPage() {
  if (!(await getUserId())) redirect("/login?next=/communities/new")
  const causes = await getCauses()
  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">Anyone can find and join your community. Only members read and post in its chat. You can remove members.</Panel>}>
      <Panel className="p-5">
        <h1 className="h-page">Start a community</h1>
        <NewCommunityForm causes={causes} />
      </Panel>
    </TwoColumn>
  )
}
