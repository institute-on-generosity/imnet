import Link from "next/link"
import { redirect } from "next/navigation"
import { CauseFilter } from "@/components/cause-filter"
import { Feed } from "@/components/post-card"
import { getCauses, getFeed, getFollowedOrgIds } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Following" }

export default async function FollowingPage({ searchParams }: PageProps<"/following">) {
  const userId = await getUserId()
  if (!userId) redirect("/login")
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined

  const orgIds = await getFollowedOrgIds(userId)
  const [posts, causes] = await Promise.all([
    orgIds.length ? getFeed({ cause: active, orgIds }) : Promise.resolve([]),
    getCauses(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-semibold">Following</h1>
      <CauseFilter causes={causes} active={active} basePath="/following" />
      {orgIds.length === 0 ? (
        <p className="text-muted-foreground">
          You don&apos;t follow any nonprofits yet. <Link href="/" className="underline">Explore</Link> to find some.
        </p>
      ) : (
        <Feed posts={posts} empty="The nonprofits you follow haven't posted for this cause yet." />
      )}
    </div>
  )
}
