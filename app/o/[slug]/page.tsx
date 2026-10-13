import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OrgProfile } from "@/components/org-profile"
import { getFeed, getOrgBySlug } from "@/lib/queries"
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

export default async function OrgPage({ params }: PageProps<"/o/[slug]">) {
  const { slug } = await params
  const data = await getOrgBySlug(slug)
  if (!data) notFound()

  const userId = await getUserId()
  const supabase = await createClient()
  const [posts, follow] = await Promise.all([
    getFeed({ orgIds: [data.org.id] }),
    userId
      ? supabase.from("follows").select("org_id").match({ user_id: userId, org_id: data.org.id }).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return <OrgProfile {...data} posts={posts} signedIn={!!userId} following={!!follow.data} />
}
