import { HomeFeed } from "@/components/home-feed"
import { parseOrgType } from "@/lib/feed-href"

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { cause, type } = await searchParams
  return <HomeFeed cause={typeof cause === "string" ? cause : undefined} orgType={parseOrgType(type)} basePath="/" />
}
