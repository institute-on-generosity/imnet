import { redirect } from "next/navigation"
import { Panel, TwoColumn } from "@/components/shell"
import { getCauses } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"
import { ProfileEditor } from "./profile-editor"

export const metadata = { title: "Edit profile" }

// Your public profile: name, headline, location, About, causes, cover and avatar.
export default async function EditProfilePage() {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/settings/profile")
  const supabase = await createClient()
  const [{ data: profile }, { data: mine }, causes] = await Promise.all([
    supabase.from("profiles").select("handle, display_name, bio, location, about, cover_url, avatar_url").eq("id", userId).single(),
    supabase.from("profile_causes").select("cause_slug").eq("user_id", userId),
    getCauses(),
  ])
  if (!profile) redirect("/")
  return (
    <TwoColumn right={<Panel className="p-4 text-sm text-muted-foreground">Everything here is public on your profile. Your giving journal and what you save stay private.</Panel>}>
      <Panel className="p-4 sm:p-6">
        <h1 className="h-page">Edit profile</h1>
        <ProfileEditor profile={profile} causes={causes} selected={(mine ?? []).map((c) => c.cause_slug)} />
      </Panel>
    </TwoColumn>
  )
}
