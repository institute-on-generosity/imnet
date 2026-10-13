import { HomeFeed } from "@/components/home-feed"

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { cause } = await searchParams
  return <HomeFeed cause={typeof cause === "string" ? cause : undefined} basePath="/" />
}
