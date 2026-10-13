import { CauseFilter } from "@/components/cause-filter"
import { Feed } from "@/components/post-card"
import { getCauses, getFeed } from "@/lib/queries"

export default async function ExplorePage({ searchParams }: PageProps<"/">) {
  const { cause } = await searchParams
  const active = typeof cause === "string" ? cause : undefined
  const [posts, causes] = await Promise.all([getFeed({ cause: active }), getCauses()])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold sm:text-5xl">What giving made possible</h1>
        <p className="story text-muted-foreground">Stories from nonprofits, in their words, with the sources behind them.</p>
      </div>
      <CauseFilter causes={causes} active={active} basePath="/" />
      <Feed posts={posts} empty="No stories for this cause yet. Try another, or see all causes." />
    </div>
  )
}
