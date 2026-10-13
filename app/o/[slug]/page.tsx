import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OrgProfile } from "@/components/org-profile"
import { decodeCursor } from "@/lib/cursor"
import { parseOrgTab } from "@/lib/org-tabs"
import { getFeedPage, getFollow, getGrantsForPosts, getMovedPostIds, getOrgBySlug, getOrgGrants, getPortfolioPosts, getSuggestedOrgs } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

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
  const [{ slug }, { tab, before }] = await Promise.all([params, searchParams])
  const data = await getOrgBySlug(slug)
  if (!data) notFound()
  const activeTab = parseOrgTab(tab, data.org.org_type)
  const cursor = activeTab === "posts" ? decodeCursor(before) : null

  const userId = await getUserId()
  const [page, follow, similar, grants, portfolio] = await Promise.all([
    getFeedPage({ orgIds: [data.org.id], before: cursor ?? undefined }),
    getFollow(userId, data.org.id),
    getSuggestedOrgs({ userId, cause: data.causes[0]?.slug, excludeId: data.org.id, limit: 4 }),
    getOrgGrants(data.org),
    activeTab === "portfolio" ? getPortfolioPosts(data.org.id) : Promise.resolve([]),
  ])
  const { posts, next } = page
  const ids = [...posts, ...portfolio].map((p) => p.id)
  const [movedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getGrantsForPosts(ids)])

  return (
    <OrgProfile
      {...data}
      posts={posts}
      postsPaging={{ next, isFirstPage: !cursor }}
      portfolio={portfolio}
      similar={similar}
      signedIn={!!userId}
      follow={follow}
      movedIds={movedIds}
      grants={grants}
      grantsByPost={grantsByPost}
      tab={activeTab}
    />
  )
}
