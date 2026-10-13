import { redirect } from "next/navigation"
import { HomeFeed } from "@/components/home-feed"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Following" }

export default async function FollowingPage({ searchParams }: PageProps<"/following">) {
  if (!(await getUserId())) redirect("/login")
  const { cause } = await searchParams
  return <HomeFeed cause={typeof cause === "string" ? cause : undefined} followingOnly basePath="/following" />
}
