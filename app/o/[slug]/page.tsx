import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OrgProfile } from "@/components/org-profile"
import { parseOrgTab } from "@/lib/org-tabs"
import { getFeed, getMovedPostIds, getOrgBySlug, getSuggestedOrgs } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"

export async function generateMetadata({ params }: PageProps<"/o/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const data = await getOrgBySlug(slug)
  if (!data) return {}
  return {
    title: data.org.name,
    description: data.org.mission ?? undefined,
    openGraph: { title: data.org.name, description: data.org.mission ?? undefined },
  }
}

export default async function OrgPage({ params, searchParams }: PageProps<"/o/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams])
  const data = await getOrgBySlug(slug)
  if (!data) notFound()

  const userId = await getUserId()
  const supabase = await createClient()
  const [posts, follow, similar] = await Promise.all([
    getFeed({ orgIds: [data.org.id] }),
    userId
      ? supabase.from("follows").select("org_id").match({ user_id: userId, org_id: data.org.id }).maybeSingle()
      : Promise.resolve({ data: null }),
    getSuggestedOrgs({ userId, cause: data.causes[0]?.slug, excludeId: data.org.id, limit: 4 }),
  ])
  const movedIds = await getMovedPostIds(userId, posts.map((p) => p.id))

  return (
    <OrgProfile
      {...data}
      posts={posts}
      similar={similar}
      signedIn={!!userId}
      following={!!follow.data}
      movedIds={movedIds}
      tab={parseOrgTab(tab)}
    />
  )
}
