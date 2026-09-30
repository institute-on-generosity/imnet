import { CauseFilter } from "@/components/cause-filter"
import { PostCard } from "@/components/post-card"
import { getCauses, getFeed } from "@/lib/queries"

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const [posts, causes] = await Promise.all([getFeed({ cause: active }), getCauses()])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Explore</h1>
        <p className="text-muted-foreground">Real impact from nonprofits, newest first.</p>
      </div>
      <CauseFilter causes={causes} active={active} basePath="/" />
      <div className="space-y-4">
        {posts.length === 0 && <p className="text-muted-foreground">No stories yet.</p>}
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
