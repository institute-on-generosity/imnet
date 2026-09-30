import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DonateButton } from "@/components/donate-button"
import { FollowButton } from "@/components/follow-button"
import { PostCard } from "@/components/post-card"
import { ShareButton } from "@/components/share-button"
import { TrackView } from "@/components/track-view"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  const { org, stats, causes, followers } = data

  const userId = await getUserId()
  const supabase = await createClient()
  const [posts, follow] = await Promise.all([
    getFeed({ orgIds: [org.id] }),
    userId
      ? supabase.from("follows").select("org_id").match({ user_id: userId, org_id: org.id }).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div className="space-y-8">
      <TrackView orgId={org.id} />
      <section className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-semibold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">
              {followers} {followers === 1 ? "follower" : "followers"}
              {org.ein && <> · EIN {org.ein}</>}
              {org.website && (
                <> · <a href={org.website} className="underline" target="_blank" rel="noopener noreferrer">Website</a></>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {userId ? (
              <FollowButton orgId={org.id} slug={org.slug} following={!!follow.data} />
            ) : (
              <Link href="/login" className="text-sm underline self-center">Sign in to follow</Link>
            )}
            {org.everyorg_slug && <DonateButton orgId={org.id} everyorgSlug={org.everyorg_slug} />}
            <ShareButton path={`/o/${org.slug}`} title={org.name} orgId={org.id} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {causes.map((c) => <Badge key={c.slug} variant="outline">{c.name}</Badge>)}
        </div>
        {org.mission && <p>{org.mission}</p>}
        {org.what_gifts_fund && (
          <div>
            <h2 className="font-medium">What your gift funds</h2>
            <p className="text-muted-foreground">{org.what_gifts_fund}</p>
          </div>
        )}
      </section>

      {stats.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Impact so far</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-sm">{s.label}</p>
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline">
                    Source{s.as_of && `, as of ${s.as_of}`}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-medium">Stories and updates</h2>
        {posts.length === 0 && <p className="text-muted-foreground">No posts yet.</p>}
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </section>
    </div>
  )
}
