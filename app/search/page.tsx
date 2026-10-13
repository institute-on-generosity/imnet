import Link from "next/link"
import { OrgMark } from "@/components/org-mark"
import { Panel, TwoColumn } from "@/components/shell"
import { searchOrgs } from "@/lib/queries"

export const metadata = { title: "Search" }

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams
  const query = typeof q === "string" ? q : ""
  const results = await searchOrgs(query)

  return (
    <TwoColumn>
      <Panel className="p-4">
        <form action="/search" role="search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search nonprofits by name"
            aria-label="Search nonprofits"
            className="h-10 w-full rounded-md bg-muted px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </Panel>
      {query && (
        <Panel>
          <h1 className="border-b px-4 py-3 font-sans text-base font-semibold tracking-normal">
            {results.length ? `Nonprofits matching "${query}"` : `No nonprofits match "${query}". Try a shorter name.`}
          </h1>
          <ul className="divide-y">
            {results.map((org) => (
              <li key={org.id}>
                <Link href={`/o/${org.slug}`} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                  <OrgMark org={org} />
                  <div className="min-w-0">
                    <p className="font-semibold">{org.name}</p>
                    {org.mission && <p className="line-clamp-2 text-sm text-muted-foreground">{org.mission}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </TwoColumn>
  )
}
