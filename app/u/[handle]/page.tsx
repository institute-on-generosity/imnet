import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { OrgTypeBadge } from "@/components/org-type-badge"
import type { OrgType } from "@/lib/types"
import { Panel, TwoColumn } from "@/components/shell"
import { createClient } from "@/lib/supabase/server"

async function getProfile(handle: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio")
    .eq("handle", handle)
    .maybeSingle()
  if (!profile) return null
  const [{ data: supports }, { data: causes }] = await Promise.all([
    supabase.from("follows").select("org:orgs(slug, name, org_type)").eq("user_id", profile.id).eq("supporter", true),
    supabase.from("profile_causes").select("cause:causes(slug, name)").eq("user_id", profile.id),
  ])
  return {
    profile,
    supports: ((supports ?? []) as unknown as { org: { slug: string; name: string; org_type: OrgType } | null }[])
      .flatMap((s) => (s.org ? [s.org] : [])),
    causes: ((causes ?? []) as unknown as { cause: { slug: string; name: string } }[]).map((c) => c.cause),
  }
}

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params
  const data = await getProfile(handle)
  return data ? { title: data.profile.display_name ?? `@${data.profile.handle}` } : {}
}

export default async function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  const { handle } = await params
  const data = await getProfile(handle)
  if (!data) notFound()
  const { profile, supports, causes } = data
  const name = profile.display_name ?? `@${profile.handle}`

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
        </div>
      </Panel>

      <Panel className="p-4 sm:p-6">
        <h2 className="font-sans text-lg font-semibold tracking-normal">Causes I care about</h2>
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

      <Panel>
        <h2 className="px-4 pt-4 font-sans text-lg font-semibold tracking-normal sm:px-6">Nonprofits I support</h2>
        {supports.length === 0 ? (
          <p className="px-4 pt-2 pb-4 text-sm text-muted-foreground sm:px-6">Nothing shared yet.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {supports.map((o) => (
              <li key={o.slug}>
                <Link href={`/o/${o.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                  <OrgMark org={{ name: o.name, logo_url: null, org_type: o.org_type }} />
                  <span className="font-medium">{o.name}</span>
                  <OrgTypeBadge type={o.org_type} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </TwoColumn>
  )
}
