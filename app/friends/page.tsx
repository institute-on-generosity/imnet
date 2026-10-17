import { redirect } from "next/navigation"
import { FriendsActivity } from "@/components/following-friends"
import Link from "@/components/intent-link"
import { PersonAvatar } from "@/components/person-avatar"
import { Panel, TwoColumn } from "@/components/shell"
import { buttonVariants } from "@/components/ui/button"
import { getFollowedPeople, getFriendsExperiences, getFriendSuggestions } from "@/lib/queries"
import { getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Friends" }
const PAGE = 30

// F-122: what the people you follow are up to: where they gave, volunteered and went, with how
// much when they chose to say. Only what they shared with their followers.
export default async function FriendsPage({ searchParams }: PageProps<"/friends">) {
  const userId = await getUserId()
  if (!userId) redirect("/login?next=/friends")
  const { before: rawBefore } = await searchParams
  const before = typeof rawBefore === "string" && !Number.isNaN(Date.parse(rawBefore)) ? rawBefore : undefined
  const [items, people, suggestions] = await Promise.all([getFriendsExperiences(userId, PAGE + 1, before), getFollowedPeople(userId), getFriendSuggestions(userId, 5)])
  const shown = items.slice(0, PAGE)
  const older = items.length > PAGE ? shown.at(-1)!.created_at : null

  return (
    <TwoColumn
      right={
        <>
          <Panel aria-labelledby="you-follow" className="p-4">
            <h2 id="you-follow" className="h-rail">People you follow · {people.length}</h2>
            {people.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Follow people from their profiles, communities or Discover</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {people.slice(0, 8).map((p) => {
                  const name = p.display_name ?? `@${p.handle}`
                  return (
                    <li key={p.id}><Link href={`/u/${p.handle}`} className="flex items-center gap-2.5 text-sm hover:underline"><PersonAvatar name={name} avatarUrl={p.avatar_url} size="sm" /><span className="truncate font-medium">{name}</span></Link></li>
                  )
                })}
              </ul>
            )}
            <Link href="/discover?tab=people" className="mt-3 block border-t pt-2.5 text-sm font-semibold text-leaf hover:underline">See everyone you follow</Link>
          </Panel>
          {suggestions.length > 0 && (
            <Panel aria-labelledby="friends-suggest" className="p-4">
              <h2 id="friends-suggest" className="h-rail">Friends to follow</h2>
              <ul className="mt-2 space-y-2.5">
                {suggestions.map((s) => {
                  const name = s.display_name ?? `@${s.handle}`
                  return (
                    <li key={s.id} className="flex items-center gap-2.5">
                      <PersonAvatar name={name} avatarUrl={s.avatar_url} size="md" />
                      <div className="min-w-0"><Link href={`/u/${s.handle}`} className="block truncate text-sm font-semibold hover:underline">{name}</Link><p className="truncate text-xs text-leaf">{s.reason}</p></div>
                    </li>
                  )
                })}
              </ul>
              <Link href="/discover" className="mt-3 block border-t pt-2.5 text-sm font-semibold text-leaf hover:underline">Find more on Discover</Link>
            </Panel>
          )}
        </>
      }
    >
      <Panel className="p-4">
        <h1 className="h-page">Friends</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Where the people you follow gave, volunteered and showed up</p>
      </Panel>
      {shown.length === 0 ? (
        <Panel className="p-6 text-sm text-muted-foreground">
          Nothing shared yet. When people you follow share an experience, it shows up here.{" "}
          <Link href="/discover" className="font-semibold text-leaf hover:underline">Find people to follow</Link>
        </Panel>
      ) : (
        <FriendsActivity items={shown} />
      )}
      {older && <Link href={`/friends?before=${encodeURIComponent(older)}`} className={buttonVariants({ variant: "outline", className: "w-full" })}>Show older</Link>}
    </TwoColumn>
  )
}
