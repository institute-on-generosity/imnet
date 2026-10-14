import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCauses, getGrantsAwaitingReport, getGrantsNeedingReport, getOrgPostsForStaff, getGrantsToConfirm, getOpenCalls, getOrgDaily, getOrgTopPosts, getEventsForStaff, getInterestForStaff, getOrgNeeds, getReportableGrants, getThanks } from "@/lib/queries"
import { total } from "@/lib/analytics"
import type { ImpactStat, Org } from "@/lib/types"
import { createClient, getUserId } from "@/lib/supabase/server"
import { AnalyticsCard } from "./analytics-card"
import { Composer } from "./composer"
import { ImpactStatsEditor } from "./impact-stats-editor"
import { EventsEditor } from "./events-editor"
import { NeedsEditor } from "./needs-editor"
import { ThanksCard } from "./thanks-card"
import { PostManager } from "./post-manager"
import { TeamCard } from "./team-card"
import { GrantsAwaitingReport } from "./grants-awaiting-report"
import { GrantsNeedingReport } from "./grants-needing-report"
import { GrantsToConfirm } from "./grants-to-confirm"
import { OpenCallsForYou } from "./open-calls-for-you"
import { ProfileForm } from "./profile-form"

export default async function OrgDashboardPage({ params, searchParams }: PageProps<"/dashboard/[orgId]">) {
  const [{ orgId }, { report }] = await Promise.all([params, searchParams])
  const userId = await getUserId()
  if (!userId) redirect("/login")
  const supabase = await createClient()

  const { data: member } = await supabase.from("org_members").select("user_id").match({ org_id: orgId, user_id: userId }).maybeSingle()
  if (!member) notFound()

  const [{ data: org }, { data: orgCauses }, causes, series, { data: followers }, top] = await Promise.all([
    supabase.from("orgs").select("id, slug, name, ein, website, mission, what_gifts_fund, logo_url, everyorg_slug, status, org_type").eq("id", orgId).single<Org>(),
    supabase.from("org_causes").select("cause_slug").eq("org_id", orgId),
    getCauses(),
    getOrgDaily(orgId),
    supabase.rpc("follower_count", { target: orgId }),
    getOrgTopPosts(orgId),
  ])
  const counts = { view: total(series, "view"), share: total(series, "share"), donate_click: total(series, "donate_click") }
  if (!org) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold">{org.name}</h1>
        <Link href={`/o/${org.slug}`} className="text-sm underline">View public profile</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Followers" value={Number(followers ?? 0)} />
        <Stat label="Views (30d)" value={counts.view} />
        <Stat label="Shares (30d)" value={counts.share} />
        <Stat label="Donate clicks (30d)" value={counts.donate_click} />
      </section>

      <Card>
        <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
        <CardContent><AnalyticsCard series={series} top={top} /></CardContent>
      </Card>

      {org.org_type === "foundation" && <GrantsAwaitingReport grants={await getGrantsAwaitingReport(org.id)} />}
      {org.org_type === "nonprofit" && <GrantsToConfirm orgId={org.id} grants={await getGrantsToConfirm(org.id)} />}
      {org.org_type === "nonprofit" && <GrantsNeedingReport orgId={org.id} grants={await getGrantsNeedingReport(org.id)} />}
      {org.org_type === "nonprofit" && (orgCauses ?? []).length > 0 && (
        <OpenCallsForYou calls={await getOpenCalls({ causes: (orgCauses ?? []).map((c) => c.cause_slug), limit: 5 })} />
      )}

      <Card id="composer" className="scroll-mt-20">
        <CardHeader><CardTitle>New post</CardTitle></CardHeader>
        <CardContent>
          <Composer
            orgId={org.id}
            orgType={org.org_type}
            reportableGrants={org.org_type === "nonprofit" ? await getReportableGrants(org.id) : []}
            reportOn={typeof report === "string" ? report : undefined}
            causes={causes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your posts</CardTitle></CardHeader>
        <CardContent><PostManager posts={await getOrgPostsForStaff(org.id)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes from supporters</CardTitle></CardHeader>
        <CardContent><ThanksCard orgId={org.id} notes={await getThanks(org.id)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current needs</CardTitle></CardHeader>
        <CardContent><NeedsEditor orgId={org.id} needs={await getOrgNeeds(org.id)} interest={Object.fromEntries(await getInterestForStaff(org.id))} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Events</CardTitle></CardHeader>
        <CardContent><EventsEditor orgId={org.id} events={await getEventsForStaff(org.id)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Impact stats</CardTitle></CardHeader>
        <CardContent>
          <ImpactStatsEditor orgId={org.id} stats={await getStats(org.id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent><TeamCard orgId={org.id} me={userId} {...await getTeam(org.id)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <ProfileForm org={org} causes={causes} selected={(orgCauses ?? []).map((c) => c.cause_slug)} />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

async function getStats(orgId: string): Promise<ImpactStat[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("impact_stats").select("id, label, value, source_url, as_of").eq("org_id", orgId).order("sort")
  return data ?? []
}

async function getTeam(orgId: string) {
  const supabase = await createClient()
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("org_members").select("user_id, profile:profiles(handle, display_name)").eq("org_id", orgId).order("created_at"),
    supabase.from("org_invites").select("id, email, token").eq("org_id", orgId).is("accepted_at", null).order("created_at"),
  ])
  return {
    members: ((members ?? []) as unknown as { user_id: string; profile: { handle: string; display_name: string | null } }[]).map((m) => ({ user_id: m.user_id, ...m.profile })),
    invites: invites ?? [],
  }
}

