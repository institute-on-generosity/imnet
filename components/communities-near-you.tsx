"use client"

import { LocateFixed } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Link from "@/components/intent-link"
import { formatMiles, milesBetween, type LatLng, type MapItem } from "@/lib/geo"
import type { GroupCard, PlacedCommunity } from "@/lib/queries"
import { communityIconSrc } from "@/lib/community-icon"
import { CommunityCard, CommunityGrid } from "./community-card"
import { LeafletView, MAP_KINDS, type MapOrigin } from "./near-map"
import { Panel } from "./shell"

const RADIUS_MI = 50
const SHOW = 6

// F-102: Communities opens on what's near you: the nearest communities on the left (above your
// communities and Discover), a map of them on the right. Starts from your profile city; switches to
// your real location if you've allowed it or tap "Use my location". The position stays in this browser.
type Props = {
  communities: PlacedCommunity[]; profile: { at: LatLng; label: string } | null; causeNames: Record<string, string>
  mine: GroupCard[]; discover: GroupCard[]; filter: React.ReactNode; discoverTitle: string
  orgs: MapItem[] // nearby nonprofits and foundations, shown on the map when toggled on (F-106)
}

export function CommunitiesNearYou({ communities, profile, causeNames, mine, discover, filter, discoverTitle, orgs }: Props) {
  const [origin, setOrigin] = useState<MapOrigin | null>(profile ? { ...profile, source: "profile" } : null)
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showOrgs, setShowOrgs] = useState<Set<"nonprofit" | "foundation">>(new Set(["nonprofit", "foundation"]))

  const locate = () => {
    if (!navigator.geolocation) return setDenied(true)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ at: { lat: p.coords.latitude, lng: p.coords.longitude }, label: "you", source: "device" }); setLocating(false) },
      () => { setDenied(true); setLocating(false) },
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }
  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" }).then((p) => { if (p.state === "granted") locate() }).catch(() => {})
  }, [])

  const ranked = useMemo(
    () => (origin ? communities.map((c) => ({ ...c, miles: milesBetween(origin.at, c) })).sort((a, b) => a.miles - b.miles) : []),
    [communities, origin],
  )
  const near = useMemo(() => ranked.filter((c) => c.miles <= RADIUS_MI), [ranked])
  const shown = useMemo(() => (near.length ? near : ranked).slice(0, SHOW), [near, ranked])
  const discoverRest = useMemo(() => { const seen = new Set(shown.map((c) => c.id)); return discover.filter((g) => !seen.has(g.id)) }, [discover, shown])
  const pins = useMemo(
    () => (near.length ? near : shown).map((c) => ({
      id: c.id, kind: "community" as const, title: c.name, subtitle: `${c.members} ${c.members === 1 ? "member" : "members"}`,
      href: `/communities/${c.slug}`, place: c.location, lat: c.lat, lng: c.lng, cause: c.cause_slug, miles: c.miles, image: communityIconSrc(c.icon_path),
    })) satisfies (MapItem & { miles: number })[],
    [near, shown],
  )
  // Nearby organizations join the map so you can see how communities, nonprofits and foundations differ.
  const orgPins = useMemo(() => {
    if (!origin) return []
    const ranked = orgs.filter((o) => showOrgs.has(o.kind as "nonprofit" | "foundation")).map((o) => ({ ...o, miles: milesBetween(origin.at, o) })).sort((a, b) => a.miles - b.miles)
    const close = ranked.filter((o) => o.miles <= RADIUS_MI)
    return close.length ? close : ranked.slice(0, 6)
  }, [orgs, origin, showOrgs])
  const allPins = useMemo(() => [...pins, ...orgPins], [pins, orgPins])
  const toggleOrg = (k: "nonprofit" | "foundation") => setShowOrgs((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-3">
        <Panel aria-labelledby="near-you" className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <h2 id="near-you" className="h-section">Communities near you</h2>
              <p className="text-sm text-muted-foreground">
                {!origin ? "Share your location to see communities close to you." : origin.source === "device" ? "Around your current location." : `Around ${origin.label}, from your profile.`}
                {" "}<Link href="/nearby" className="font-semibold text-leaf hover:underline">Volunteering and events near you</Link>
              </p>
            </div>
            {origin?.source !== "device" && (
              <button type="button" onClick={locate} disabled={locating}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary pr-3 pl-[11px] text-sm font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-95">
                <LocateFixed className="size-4" aria-hidden />{locating ? "Finding you..." : "Use my location"}
              </button>
            )}
          </div>
          {denied && <p role="status" className="px-4 pt-3 text-xs text-muted-foreground">Location is off for this site{profile ? `, so this uses ${profile.label} from your profile` : ""}.</p>}
          {origin && near.length === 0 && ranked.length > 0 && <p className="px-4 pt-3 text-sm text-muted-foreground">Nothing within {RADIUS_MI} miles yet. The closest:</p>}
          {origin && (
            <CommunityGrid>
              {shown.map((c) => (
                <li key={c.id} onMouseEnter={() => setSelected(c.id)} onFocus={() => setSelected(c.id)}>
                  <CommunityCard {...c} causeName={c.cause_slug ? causeNames[c.cause_slug] : undefined} place={{ location: c.location, distance: formatMiles(c.miles) }} joined={c.joined} />
                </li>
              ))}
            </CommunityGrid>
          )}
        </Panel>
        {mine.length > 0 && (
          <Panel aria-labelledby="your-communities" className="overflow-hidden">
            <h2 id="your-communities" className="h-section border-b px-4 py-3">Your communities</h2>
            <CommunityGrid>
              {mine.map((g) => <li key={g.id}><CommunityCard {...g} description={null} causeName={g.cause_slug ? causeNames[g.cause_slug] : undefined} unread={g.unread} compact /></li>)}
            </CommunityGrid>
          </Panel>
        )}

        <Panel aria-labelledby="discover" className="overflow-hidden">
          <div className="space-y-3 border-b px-4 py-3">
            <h2 id="discover" className="h-section">{discoverTitle}</h2>
            {filter}
          </div>
          {/* Anything already shown near you isn't repeated here. */}
          {discoverRest.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No other communities here yet. Start one.</p>
          ) : (
            <CommunityGrid>
              {discoverRest.map((g) => <li key={g.id}><CommunityCard {...g} causeName={g.cause_slug ? causeNames[g.cause_slug] : undefined} description={g.description} /></li>)}
            </CommunityGrid>
          )}
        </Panel>
      </div>
      {/* The map: sticky beside the list on wide screens, first on phones. */}
      <div className="relative order-first h-[38dvh] min-h-[260px] overflow-hidden rounded-xl border lg:order-none lg:sticky lg:top-20 lg:h-[calc(100dvh-110px)]">
        <LeafletView origin={origin ?? { at: { lat: 39.5, lng: -98.35 }, label: "the United States", source: "none" }} items={allPins} radius={null} selected={selected} onSelect={setSelected} />
        {/* Also show organizations near you. */}
        <div role="group" aria-label="Also show on the map" className="absolute top-2 right-2 z-[500] flex gap-1.5">
          {(["nonprofit", "foundation"] as const).map((k) => {
            const K = MAP_KINDS[k], on = showOrgs.has(k)
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => toggleOrg(k)}
                className="inline-flex items-center gap-1.5 rounded-full bg-card/95 py-1 pr-2.5 pl-2 text-xs font-semibold shadow-md ring-1 ring-border transition-[opacity,transform] active:scale-95"
                style={{ color: on ? K.color : "var(--ink-faint)" }}>
                <K.Icon className="size-3.5" aria-hidden />{K.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
