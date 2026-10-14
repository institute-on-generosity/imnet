import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { OrgTypeBadge } from "@/components/org-type-badge"
import { GivingBecame } from "@/components/giving-became"
import { getActivity, getDonorOrgs, getOrgGrants } from "@/lib/queries"
import { HandHeart } from "lucide-react"
import { ago } from "@/lib/comments"
import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"
import { Panel, TwoColumn } from "@/components/shell"
import { createClient, getUserId } from "@/lib/supabase/server"

async function getProfile(handle: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, created_at")
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
    tab === "activity" ? getActivity(profile.id) : Promise.resolve([]),
  ])
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const base = `/u/${profile.handle}`

  return (
    <TwoColumn>
      <Panel className="overflow-hidden">
        <div className="h-24 bg-leaf-soft sm:h-32" />
        <div className="px-4 pb-5 sm:px-6">
          <span aria-hidden className="-mt-12 grid size-24 place-items-center rounded-full border-4 border-card bg-leaf font-heading text-4xl text-white">
            {name.replace("@", "").charAt(0).toUpperCase()}
          </span>
          <h1 className="mt-3 text-3xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          {profile.bio && <p className="mt-3 max-w-prose">{profile.bio}</p>}
          <p className="mt-2 text-sm text-muted-foreground">Joined {joined}</p>
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

      {tab === "activity" && (
        <Panel aria-labelledby="activity">
          <h2 id="activity" className="px-4 pt-4 font-sans text-lg font-semibold tracking-normal sm:px-6">Comments</h2>
          {activity.length === 0 ? (
            <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground sm:px-6">No comments yet.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {activity.map((a) => (
                <li key={a.id} className="px-4 py-3 sm:px-6">
                  <p className="text-xs text-muted-foreground">
                    {name} {a.parent_id ? "replied" : "commented"} on a post by{" "}
                    <Link href={`/o/${a.post.org.slug}`} className="font-medium text-foreground hover:underline">{a.post.org.name}</Link>
                    {" "}• <time dateTime={a.created_at}>{ago(a.created_at)}</time>
                    {a.donor && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-marigold-soft px-1.5 py-px text-[10px] font-semibold text-amber-800"><HandHeart className="size-3" aria-hidden />Donor</span>}
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
        </Panel>
      )}

      {tab === "about" && (
        <>
        {gaveTo.length > 0 && (
          <Panel aria-labelledby="gave-to" className="p-4 sm:p-6">
            <h2 id="gave-to" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal"><HandHeart className="size-5 text-marigold" aria-hidden />{isOwn ? "I've given to" : "Has given to"}</h2>
            <p className="text-xs text-muted-foreground">Self-reported in their giving journal. Amounts stay private.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {gaveTo.map((o) => (
                <li key={o.id}><Link href={`/o/${o.slug}`} className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm hover:bg-muted"><OrgMark org={o} size="sm" />{o.name}</Link></li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel className="p-4 sm:p-6">
          <h2 className="font-sans text-lg font-semibold tracking-normal">{isOwn ? "Causes I care about" : "Causes they care about"}</h2>
          {causes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">None added yet.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {causes.map((c) => (
                <li key={c.slug}><Link href={`/?cause=${c.slug}`} className="rounded-full bg-muted px-3 py-1 hover:bg-secondary">{c.name}</Link></li>
              ))}
            </ul>
          )}
        </Panel>

        <GivingBecame funds={funds} isOwn={isOwn} />

        <Panel>
          <h2 className="px-4 pt-4 font-sans text-lg font-semibold tracking-normal sm:px-6">{isOwn ? "Organizations I support" : "Organizations they support"}</h2>
          <p className="px-4 text-xs text-muted-foreground sm:px-6">Self-reported</p>
          {supports.length === 0 ? (
            <p className="px-4 pt-2 pb-4 text-sm text-muted-foreground sm:px-6">Nothing shared yet.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {supports.map((o) => (
                <li key={o.slug}>
                  <Link href={`/o/${o.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                    <OrgMark org={o} />
                    <span className="font-medium">{o.name}</span>
                    <OrgTypeBadge type={o.org_type} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        </>
      )}
    </TwoColumn>
  )
}
