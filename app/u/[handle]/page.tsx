import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
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
    supabase.from("follows").select("org:orgs(slug, name)").eq("user_id", profile.id).eq("supporter", true),
    supabase.from("profile_causes").select("cause:causes(slug, name)").eq("user_id", profile.id),
  ])
  return {
    profile,
    supports: ((supports ?? []) as unknown as { org: { slug: string; name: string } | null }[])
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{profile.display_name ?? `@${profile.handle}`}</h1>
        <p className="text-sm text-muted-foreground">@{profile.handle}</p>
        {profile.bio && <p>{profile.bio}</p>}
      </div>
      {causes.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Causes I care about</h2>
          <div className="flex flex-wrap gap-2">
            {causes.map((c) => <Badge key={c.slug} variant="outline">{c.name}</Badge>)}
          </div>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="font-medium">Nonprofits I support</h2>
        {supports.length === 0 ? (
          <p className="text-muted-foreground">Nothing shared yet.</p>
        ) : (
          <ul className="list-disc pl-5">
            {supports.map((o) => <li key={o.slug}><Link href={`/o/${o.slug}`} className="underline">{o.name}</Link></li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
