import { HomeFeed } from "@/components/home-feed"
import { parseOrgType } from "@/lib/feed-href"

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { cause, type, before } = await searchParams
  const t = parseOrgType(type)
  // F-118: "Following" is a filter on Home (the Following page no longer has its own feed).
  return <HomeFeed cause={typeof cause === "string" ? cause : undefined} orgType={t === "following" ? undefined : t} followingOnly={t === "following"} before={typeof before === "string" ? before : undefined} basePath="/" />
}
