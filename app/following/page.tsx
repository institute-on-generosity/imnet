import { redirect } from "next/navigation"
import { HomeFeed } from "@/components/home-feed"
import { parseOrgType } from "@/lib/feed-href"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Following" }

export default async function FollowingPage({ searchParams }: PageProps<"/following">) {
  if (!(await getUserId())) redirect("/login")
  const { cause, type, before } = await searchParams
  return <HomeFeed cause={typeof cause === "string" ? cause : undefined} orgType={parseOrgType(type)} before={typeof before === "string" ? before : undefined} followingOnly basePath="/following" />
}
