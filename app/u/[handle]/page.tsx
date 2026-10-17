import type { Metadata } from "next"
import Link from "@/components/intent-link"
import { notFound } from "next/navigation"
import { OrgMark } from "@/components/org-mark"
import { PersonAvatar } from "@/components/person-avatar"
import { FoundationMark } from "@/components/org-type-badge"
import { GivingBecame } from "@/components/giving-became"
import { getActivity, getDonorOrgs, getFollowedPersonIds, getGivingSummary, getMovedPostIds, getVolunteerSummary, getOrgGrants, getPersonPosts, getSavedPostIds, getPersonExperiences } from "@/lib/queries"
import { Feed } from "@/components/post-card"
import { GivingSummaryPanel } from "@/components/giving-summary"
import { VolunteerSummaryPanel } from "@/components/volunteer-summary"
import { CalendarDays, HandHeart, MapPin, MessageSquare, Pencil, Plus } from "lucide-react"
import { startConversation } from "@/app/actions"
import { FollowButton } from "@/components/follow-button"
import { Button, buttonVariants } from "@/components/ui/button"
import { personCoverSrc } from "@/lib/cover"
import { ago } from "@/lib/comments"
import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"
import { Panel, TwoColumn } from "@/components/shell"
import { PersonExperiences, PublicFigureBadge } from "@/components/notable"
import { ReportDialog } from "@/components/report-dialog"
import { createClient, getUserId } from "@/lib/supabase/server"

async function getProfile(handle: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, created_at, avatar_url, location, about, cover_url, public_figure, public_figure_note")
    .eq("handle", handle)
    .maybeSingle()
  if (!profile) return null
  const { data: supports } = await supabase.from("follows").select("org:orgs(id, slug, name, logo_url, org_type)").eq("user_id", profile.id).eq("supporter", true)
  return {
    profile,
    supports: ((supports ?? []) as unknown as { org: OrgSummary | null }[])
      .flatMap((s) => (s.org ? [s.org] : [])),
  }
}

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params
  const data = await getProfile(handle)
  return data ? { title: data.profile.display_name ?? `@${data.profile.handle}` } : {}
}

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[handle]">) {
  const [{ handle }, { tab: rawTab }] = await Promise.all([params, searchParams])
  const tab = rawTab === "activity" ? "activity" : "about"
  const data = await getProfile(handle)
  if (!data) notFound()
  const { profile, supports } = data
  const name = profile.display_name ?? `@${profile.handle}`
  const viewerId = await getUserId()
  const isOwn = viewerId === profile.id
  const followsThem = viewerId && !isOwn ? (await getFollowedPersonIds(viewerId)).includes(profile.id) : false
  // F-100: Message shows only when you may message them (a shared group, or they follow you).
  const canMessage = viewerId && !isOwn ? !!(await (await createClient()).rpc("can_message", { other: profile.id })).data : false
  const [funds, gaveTo, activity, totals, posts, volunteering, experiences] = await Promise.all([
    Promise.all(supports.filter((o) => o.org_type === "foundation").map(async (foundation) => ({ foundation, grants: await getOrgGrants(foundation) }))),
    getDonorOrgs(profile.id),
    getActivity(profile.id),
    getGivingSummary(profile.id),
    getPersonPosts(profile.id),
    getVolunteerSummary(profile.id),
    viewerId ? getPersonExperiences(profile.id) : Promise.resolve([]), // F-111: RLS shows them to followers only
  ])
  const shownPosts = tab === "activity" ? posts : posts.slice(0, 2)
  const postIds = shownPosts.map((p) => p.id)
  const [movedIds, savedIds] = await Promise.all([getMovedPostIds(viewerId, postIds), getSavedPostIds(viewerId, postIds)])
  const joined = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const base = `/u/${profile.handle}`
  const shownActivity = tab === "activity" ? activity : activity.slice(0, 3)

  // Giving lists sit beside the story on desktop and after it on phones.
  const giving = (where: string) => (
    <>
      {!totals && <OrgListCard id={`gave-to-${where}`} title={isOwn ? "I've given to" : "Has given to"} note="Self-reported in their giving journal. Amounts stay private." orgs={gaveTo} icon />}
      <OrgListCard id={`supports-${where}`} title={isOwn ? "Organizations I support" : "Organizations they support"} note="Self-reported" orgs={supports} />
    </>
  )

  return (
    <TwoColumn right={<div className="hidden space-y-3 lg:block">{giving("rail")}</div>}>
      <Panel className="overflow-hidden">
        {personCoverSrc(profile.cover_url) ? (
          <div className="aspect-[3/1] bg-muted sm:aspect-[4/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={personCoverSrc(profile.cover_url)!} alt="" fetchPriority="high" className="size-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[3/1] bg-gradient-to-r from-leaf-soft via-leaf-soft to-marigold-soft sm:aspect-[4/1]" />
        )}
        <div className="px-4 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <PersonAvatar name={name} avatarUrl={profile.avatar_url} size="xl" className="-mt-12 block border-4 border-card bg-card sm:-mt-14" />
            {isOwn && <Link href="/settings/profile" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}><Pencil aria-hidden />Edit profile</Link>}
            {!isOwn && viewerId && (
              <div className="mt-3 flex gap-2">
                <FollowButton orgId={profile.id} orgName={name} following={followsThem} person />
                {canMessage && (
                  <form action={startConversation.bind(null, profile.id)}>
                    <Button type="submit" variant="outline"><MessageSquare aria-hidden />Message</Button>
                  </form>
                )}
                <ReportDialog profileId={profile.id} name={name} />
              </div>
            )}
            {!isOwn && !viewerId && <Link href="/login" className={buttonVariants({ size: "sm", className: "mt-3" })}><Plus aria-hidden />Follow</Link>}
          </div>
          <h1 className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-3xl font-semibold tracking-tight">
            {name}
            {/* F-113: admin-verified public figure. */}
            {profile.public_figure && <Link href="/verified"><PublicFigureBadge note={profile.public_figure_note} /></Link>}
          </h1>
          {profile.bio && <p className="mt-1 max-w-prose text-lg leading-snug">{profile.bio}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-faint">
            <span>@{profile.handle}</span>
            <span aria-hidden>•</span>
            {profile.location && <><span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{profile.location}</span><span aria-hidden>•</span></>}
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden />Joined {joined}</span>
            {gaveTo.length > 0 && (
              <>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-800"><HandHeart className="size-4" aria-hidden />Donor</span>
              </>
            )}
          </p>
        </div>
        <nav aria-label="Profile sections" className="flex border-t px-2 sm:px-4">
          {(["about", "activity"] as const).map((t) => (
            <Link key={t} href={t === "about" ? base : `${base}?tab=${t}`} aria-current={tab === t ? "page" : undefined}
              className={cn("border-b-2 px-3 py-3 text-sm font-semibold capitalize transition-colors", tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t}
            </Link>
          ))}
        </nav>
      </Panel>

      {tab === "about" && profile.about && (
        <Panel aria-labelledby="about-me" className="p-4 sm:p-6">
          <h2 id="about-me" className="h-section">About</h2>
          <p className="story mt-2 whitespace-pre-line">{profile.about}</p>
        </Panel>
      )}
      {tab === "about" && totals && <GivingSummaryPanel summary={totals} isOwn={isOwn} />}
      {tab === "about" && <PersonExperiences items={experiences} isOwn={isOwn} name={name} />}
      {tab === "about" && volunteering && <VolunteerSummaryPanel summary={volunteering} isOwn={isOwn} />}
      {tab === "about" && <GivingBecame funds={funds} isOwn={isOwn} />}
      {tab === "about" && <div className="space-y-3 lg:hidden">{giving("main")}</div>}

      {shownPosts.length > 0 && (
        <section aria-labelledby="posts" className="space-y-3">
          <h2 id="posts" className="px-1 h-section">Posts</h2>
          <Feed posts={shownPosts} empty="" movedIds={movedIds} savedIds={savedIds} signedIn={!!viewerId} />
          {tab === "about" && posts.length > 2 && (
            <Link href={`${base}?tab=activity`} className={buttonVariants({ variant: "outline", className: "w-full" })}>Show all posts</Link>
          )}
        </section>
      )}
      {(tab === "activity" || activity.length > 0) && (
      <Panel aria-labelledby="activity">
        <div className="flex items-baseline justify-between px-4 pt-4 sm:px-6">
          <h2 id="activity" className="h-section">{tab === "activity" ? "Comments" : "Recent comments"}</h2>
        </div>
        {shownActivity.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-sm text-muted-foreground sm:px-6">No comments yet</p>
        ) : (
          <ul className="mt-2 divide-y">
            {shownActivity.map((a) => (
              <li key={a.id} className="px-4 py-3 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  {a.parent_id ? "Replied" : "Commented"} on a post by{" "}
                  {a.post.org ? (
                    <Link href={`/o/${a.post.org.slug}`} className="font-medium text-foreground hover:underline">{a.post.org.name}</Link>
                  ) : a.post.author ? (
                    <Link href={`/u/${a.post.author.handle}`} className="font-medium text-foreground hover:underline">{a.post.author.display_name ?? `@${a.post.author.handle}`}</Link>
                  ) : null}
                  {" "}• <time dateTime={a.created_at}>{ago(a.created_at)}</time>
                  {a.donor && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-marigold-soft py-px pr-1.5 pl-1 text-[10px] font-semibold text-amber-800"><HandHeart className="size-3" aria-hidden />Donor</span>}
                </p>
                <p className="mt-1 whitespace-pre-line">{a.body}</p>
                <Link href={`/p/${a.post.id}#comments`} className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm hover:bg-muted">
                  {a.post.org ? <OrgMark org={a.post.org} size="sm" /> : a.post.author ? <PersonAvatar name={a.post.author.display_name ?? a.post.author.handle} avatarUrl={a.post.author.avatar_url} size="xs" className="size-6" /> : null}
                  <span className="line-clamp-1 text-muted-foreground">{a.post.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {tab === "about" && activity.length > 3 && (
          <Link href={`${base}?tab=activity`} className="block border-t px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:bg-muted">Show all activity</Link>
        )}
      </Panel>
      )}
    </TwoColumn>
  )
}

// Compact list of orgs (logo, name, foundation marker) for the right column.
function OrgListCard({ id, title, note, orgs, icon }: { id: string; title: string; note: string; orgs: OrgSummary[]; icon?: boolean }) {
  if (orgs.length === 0) return null
  return (
    <Panel aria-labelledby={id} className="p-4">
      <h2 id={id} className="flex items-center gap-1.5 h-rail">
        {icon && <HandHeart className="size-4 text-marigold" aria-hidden />}{title}
      </h2>
      <p className="text-xs text-muted-foreground">{note}</p>
      <ul className="mt-3 space-y-2.5">
        {orgs.map((o) => (
          <li key={o.id}>
            <Link href={`/o/${o.slug}`} className="flex items-center gap-2.5 text-sm font-medium hover:underline">
              <OrgMark org={o} size="sm" />
              <span className="min-w-0 truncate">{o.name}</span>
              {o.org_type === "foundation" && <FoundationMark />}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
