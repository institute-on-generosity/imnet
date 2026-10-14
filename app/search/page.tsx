import Link from "next/link"
import { OrgMark } from "@/components/org-mark"
import { PersonAvatar } from "@/components/person-avatar"
import { OrgTypeBadge } from "@/components/org-type-badge"
import { Panel, TwoColumn } from "@/components/shell"
import { searchOrgs, searchPeople, searchPosts } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const metadata = { title: "Search" }

const TABS = { all: "All", orgs: "Organizations", people: "People", posts: "Posts" } as const
type Tab = keyof typeof TABS

// One search box for organizations, people and post text (as on LinkedIn). Alphabetical or
// newest first; never ranked by popularity.
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q, type } = await searchParams
  const query = typeof q === "string" ? q : ""
  const tab: Tab = typeof type === "string" && type in TABS ? (type as Tab) : "all"
  const want = (t: Tab) => tab === "all" || tab === t
  const [orgs, people, posts] = await Promise.all([
    want("orgs") ? searchOrgs(query) : [],
    want("people") ? searchPeople(query) : [],
    want("posts") ? searchPosts(query) : [],
  ])
  const limit = (n: number) => (tab === "all" ? n : 20)
  const nothing = orgs.length + people.length + posts.length === 0
  const href = (t: Tab) => `/search?q=${encodeURIComponent(query)}${t === "all" ? "" : `&type=${t}`}`

  return (
    <TwoColumn>
      <Panel className="p-4">
        <form action="/search" role="search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search organizations, people and posts"
            aria-label="Search"
            className="h-10 w-full rounded-md bg-muted px-3 outline-none focus:ring-2 focus:ring-ring"
          />
          {tab !== "all" && <input type="hidden" name="type" value={tab} />}
        </form>
        {query && (
          <nav aria-label="Result types" className="mt-3 flex gap-2 overflow-x-auto">
            {(Object.keys(TABS) as Tab[]).map((t) => (
              <Link key={t} href={href(t)} aria-current={tab === t ? "page" : undefined}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", tab === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {TABS[t]}
              </Link>
            ))}
          </nav>
        )}
      </Panel>

      {query && nothing && <Panel className="p-4 text-sm text-muted-foreground">Nothing matches &ldquo;{query}&rdquo;. Try a shorter word.</Panel>}

      {orgs.length > 0 && (
        <Section title="Organizations" more={tab === "all" && orgs.length > 3 ? href("orgs") : undefined}>
          {orgs.slice(0, limit(3)).map((org) => (
            <li key={org.id}>
              <Link href={`/o/${org.slug}`} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                <OrgMark org={org} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">{org.name} <OrgTypeBadge type={org.org_type} /></p>
                  {org.mission && <p className="line-clamp-2 text-sm text-muted-foreground">{org.mission}</p>}
                </div>
              </Link>
            </li>
          ))}
        </Section>
      )}

      {people.length > 0 && (
        <Section title="People" more={tab === "all" && people.length > 3 ? href("people") : undefined}>
          {people.slice(0, limit(3)).map((p) => {
            const name = p.display_name ?? `@${p.handle}`
            return (
              <li key={p.id}>
                <Link href={`/u/${p.handle}`} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                  <PersonAvatar name={name} avatarUrl={p.avatar_url} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">{p.bio ?? `@${p.handle}`}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </Section>
      )}

      {posts.length > 0 && (
        <Section title="Posts" more={tab === "all" && posts.length > 3 ? href("posts") : undefined}>
          {posts.slice(0, limit(3)).map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.id}`} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                <OrgMark org={p.org} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.org.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </Section>
      )}
    </TwoColumn>
  )
}

function Section({ title, more, children }: { title: string; more?: string; children: React.ReactNode }) {
  return (
    <Panel aria-labelledby={`results-${title}`}>
      <h2 id={`results-${title}`} className="border-b px-4 py-3 font-sans text-base font-semibold tracking-normal">{title}</h2>
      <ul className="divide-y">{children}</ul>
      {more && <Link href={more} className="block border-t px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:bg-muted">See all {title.toLowerCase()} results</Link>}
    </Panel>
  )
}
