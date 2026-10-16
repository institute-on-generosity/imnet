import { lookupIrsOrg } from "@/lib/irs/nombot"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { OrgProfile } from "@/components/org-profile"
import { decodeCursor } from "@/lib/cursor"
import { parseOrgTab } from "@/lib/org-tabs"
import { getFeedPage, getFollow, getGrantsForPosts, getMovedPostIds, getSavedPostIds, getOrgBySlug, getOrgGrants, getOrgNeeds, getMyInterestIds, getMyRsvpIds, getTopSupporters, getUpcomingEvents, getPortfolioPosts, getSuggestedOrgs } from "@/lib/queries"
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
  const [page, follow, similar, grants, portfolio, needs, events, supporters, irs] = await Promise.all([
    getFeedPage({ orgIds: [data.org.id], before: cursor ?? undefined }),
    getFollow(userId, data.org.id),
    getSuggestedOrgs({ userId, cause: data.causes[0]?.slug, excludeId: data.org.id, limit: 4 }),
    getOrgGrants(data.org),
    activeTab === "portfolio" ? getPortfolioPosts(data.org.id) : Promise.resolve([]),
    activeTab === "home" ? getOrgNeeds(data.org.id) : Promise.resolve([]),
    activeTab === "home" ? getUpcomingEvents({ orgId: data.org.id, limit: 5 }) : Promise.resolve([]),
    activeTab === "home" && data.org.org_type === "nonprofit" ? getTopSupporters(data.org.id) : Promise.resolve([]),
    lookupIrsOrg(data.org.ein), // F-110: public filings, when the EIN is in IRS records
  ])
  const [interestIds, rsvpIds] = await Promise.all([getMyInterestIds(userId, needs.map((n) => n.id)), getMyRsvpIds(userId, events.map((e) => e.id))])
  const { posts, next } = page
  const ids = [...posts, ...portfolio].map((p) => p.id)
  const [movedIds, savedIds, grantsByPost] = await Promise.all([getMovedPostIds(userId, ids), getSavedPostIds(userId, ids), getGrantsForPosts(ids)])

  return (
    <OrgProfile
      {...data}
      posts={posts}
      postsPaging={{ next, isFirstPage: !cursor }}
      portfolio={portfolio}
      similar={similar}
      signedIn={!!userId}
      follow={follow}
      movedIds={movedIds} savedIds={savedIds}
      grants={grants}
      grantsByPost={grantsByPost}
      tab={activeTab}
      needs={needs}
      interestIds={interestIds}
      events={events}
      rsvpIds={rsvpIds}
      supporters={supporters}
      irs={irs}
    />
  )
}
