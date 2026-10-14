import type { Metadata } from "next"
import Link from "@/components/intent-link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { PersonAvatar } from "@/components/person-avatar"
import { FoundationMark } from "@/components/org-type-badge"
import { GivingBecame } from "@/components/giving-became"
import { getActivity, getDonorOrgs, getOrgGrants } from "@/lib/queries"
import { CalendarDays, HandHeart } from "lucide-react"
import { ago } from "@/lib/comments"
import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"
import { Panel, TwoColumn } from "@/components/shell"
import { createClient, getUserId } from "@/lib/supabase/server"

async function getProfile(handle: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, created_at, avatar_url")
    .eq("handle", handle)
    .maybeSingle()
  if (!profile) return null
  const [{ data: supports }, { data: causes }] = await Promise.all([
    supabase.from("follows").select("org:orgs(id, slug, name, logo_url, org_type)").eq("user_id", profile.id).eq("supporter", true),
    supabase.from("profile_causes").select("cause:causes(slug, name)").eq("user_id", profile.id),
  ])
  return {
    profile,
    supports: ((supports ?? []) as unknown as { org: OrgSummary | null }[])
      .flatMap((s) => (s.org ? [s.org] : [])),
    causes: ((causes ?? []) as unknown as { cause: { slug: string; name: string } }[]).map((c) => c.cause),
  }
}

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params
  const data = await getProfile(handle)
  return data ? { title: data.profile.display_name ?? `@${data.profile.handle}` } : {}
}

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[handle]">) {
  const [{ handle }, { tab: rawTab }] = await Promise.all([params, searchParams])
  const tab = rawTab === "activity" ? "activity" : "about"
  const data = await getProfile(handle)
  if (!data) notFound()
  const { profile, supports, causes } = data
  const name = profile.display_name ?? `@${profile.handle}`
  const isOwn = (await getUserId()) === profile.id
  const [funds, gaveTo, activity] = await Promise.all([
    Promise.all(supports.filter((o) => o.org_type === "foundation").map(async (foundation) => ({ foundation, grants: await getOrgGrants(foundation) }))),
    getDonorOrgs(profile.id),
    getActivity(profile.id),
  ])
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const base = `/u/${profile.handle}`
  const shownActivity = tab === "activity" ? activity : activity.slice(0, 3)

  // Giving lists sit beside the story on desktop and after it on phones.
  const giving = (where: string) => (
    <>
      <OrgListCard id={`gave-to-${where}`} title={isOwn ? "I've given to" : "Has given to"} note="Self-reported in their giving journal. Amounts stay private." orgs={gaveTo} icon />
      <OrgListCard id={`supports-${where}`} title={isOwn ? "Organizations I support" : "Organizations they support"} note="Self-reported" orgs={supports} />
    </>
  )

  return (
    <TwoColumn right={<div className="hidden space-y-3 lg:block">{giving("rail")}</div>}>
      <Panel className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-leaf-soft via-leaf-soft to-marigold-soft sm:h-32" />
        <div className="px-4 pb-5 sm:px-6">
          <PersonAvatar name={name} avatarUrl={profile.avatar_url} size="xl" className="-mt-12 block border-4 border-card bg-card sm:-mt-14" />
          <h1 className="mt-3 text-3xl font-semibold">{name}</h1>
          {profile.bio && <p className="mt-1 max-w-prose text-lg leading-snug text-foreground/80">{profile.bio}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>@{profile.handle}</span>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden />Joined {joined}</span>
            {gaveTo.length > 0 && (
              <>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-800"><HandHeart className="size-4" aria-hidden />Donor</span>
              </>
            )}
          </p>
          {causes.length > 0 && (
            <ul aria-label={isOwn ? "Causes I care about" : "Causes they care about"} className="mt-3 flex flex-wrap gap-1.5 text-sm">
              {causes.map((c) => (
                <li key={c.slug}><Link href={`/?cause=${c.slug}`} className="rounded-full border border-leaf/30 bg-leaf-soft px-3 py-1 text-leaf hover:bg-leaf hover:text-white">{c.name}</Link></li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Profile sections" className="flex border-t px-2 sm:px-4">
          {(["about", "activity"] as const).map((t) => (
            <Link key={t} href={t === "about" ? base : `${base}?tab=${t}`} aria-current={tab === t ? "page" : undefined}
              className={cn("border-b-2 px-3 py-3 text-sm font-semibold capitalize transition-colors", tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t}
            </Link>
          ))}
        </nav>
      </Panel>

      {tab === "about" && <GivingBecame funds={funds} isOwn={isOwn} />}
      {tab === "about" && <div className="space-y-3 lg:hidden">{giving("main")}</div>}

      {(tab === "activity" || activity.length > 0) && (
      <Panel aria-labelledby="activity">
        <div className="flex items-baseline justify-between px-4 pt-4 sm:px-6">
          <h2 id="activity" className="font-sans text-lg font-semibold tracking-normal">{tab === "activity" ? "Comments" : "Recent activity"}</h2>
        </div>
        {shownActivity.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground sm:px-6">No comments yet.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {shownActivity.map((a) => (
              <li key={a.id} className="px-4 py-3 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  {a.parent_id ? "Replied" : "Commented"} on a post by{" "}
                  <Link href={`/o/${a.post.org.slug}`} className="font-medium text-foreground hover:underline">{a.post.org.name}</Link>
                  {" "}• <time dateTime={a.created_at}>{ago(a.created_at)}</time>
                  {a.donor && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-marigold-soft py-px pr-1.5 pl-1 text-[10px] font-semibold text-amber-800"><HandHeart className="size-3" aria-hidden />Donor</span>}
                </p>
                <p className="mt-1 whitespace-pre-line">{a.body}</p>
                <Link href={`/p/${a.post.id}#comments`} className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm hover:bg-muted">
                  <OrgMark org={a.post.org} size="sm" />
                  <span className="line-clamp-1 text-muted-foreground">{a.post.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {tab === "about" && activity.length > 3 && (
          <Link href={`${base}?tab=activity`} className="block border-t px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:bg-muted">Show all activity</Link>
        )}
      </Panel>
      )}
    </TwoColumn>
  )
}

// Compact list of orgs (logo, name, foundation marker) for the right column.
function OrgListCard({ id, title, note, orgs, icon }: { id: string; title: string; note: string; orgs: OrgSummary[]; icon?: boolean }) {
  if (orgs.length === 0) return null
  return (
    <Panel aria-labelledby={id} className="p-4">
      <h2 id={id} className="flex items-center gap-1.5 font-sans text-base font-semibold tracking-normal">
        {icon && <HandHeart className="size-4 text-marigold" aria-hidden />}{title}
      </h2>
      <p className="text-xs text-muted-foreground">{note}</p>
      <ul className="mt-3 space-y-2.5">
        {orgs.map((o) => (
          <li key={o.id}>
            <Link href={`/o/${o.slug}`} className="flex items-center gap-2.5 text-sm font-medium hover:underline">
              <OrgMark org={o} size="sm" />
              <span className="min-w-0 truncate">{o.name}</span>
              {o.org_type === "foundation" && <FoundationMark />}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
