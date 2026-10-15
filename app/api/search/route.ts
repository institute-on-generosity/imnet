import { NextResponse } from "next/server"
import { searchEvents, searchOrgs, searchPeople } from "@/lib/queries"

// GET /api/search?q=: header typeahead (F-083). A few organizations, people and events; the
// full results page covers posts and needs. Public data only (RLS).
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return NextResponse.json({ orgs: [], people: [], events: [] })
  const [orgs, people, events] = await Promise.all([searchOrgs(q), searchPeople(q), searchEvents(q)])
  return NextResponse.json(
    {
      orgs: orgs.slice(0, 4).map((o) => ({ slug: o.slug, name: o.name, logo_url: o.logo_url, org_type: o.org_type })),
      people: people.slice(0, 3).map((p) => ({ handle: p.handle, name: p.display_name ?? `@${p.handle}`, bio: p.bio, avatar_url: p.avatar_url })),
      events: events.slice(0, 2).map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at, org: e.org.name })),
    },
    { headers: { "cache-control": "private, max-age=30" } },
  )
}
