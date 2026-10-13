import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCauses, getGrantsNeedingReport, getGrantsToConfirm, getOpenCalls, getOrgEventCounts, getReportableGrants } from "@/lib/queries"
import type { Org } from "@/lib/types"
import { createClient, getUserId } from "@/lib/supabase/server"
import { Composer } from "./composer"
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

  const [{ data: org }, { data: orgCauses }, causes, counts, { data: followers }] = await Promise.all([
    supabase.from("orgs").select("id, slug, name, ein, website, mission, what_gifts_fund, logo_url, everyorg_slug, status, org_type").eq("id", orgId).single<Org>(),
    supabase.from("org_causes").select("cause_slug").eq("org_id", orgId),
    getCauses(),
    getOrgEventCounts(orgId),
    supabase.rpc("follower_count", { target: orgId }),
  ])
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
