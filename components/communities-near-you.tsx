"use client"

import { LocateFixed, MapPin } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Link from "@/components/intent-link"
import { formatMiles, milesBetween, type LatLng, type MapItem } from "@/lib/geo"
import type { PlacedCommunity } from "@/lib/queries"
import { communityIconSrc } from "@/lib/community-icon"
import { CommunityMark } from "./community-mark"
import { LeafletView, type MapOrigin } from "./near-map"
import { Panel } from "./shell"

const RADIUS_MI = 50
const SHOW = 6

// F-102: Communities opens on what's near you: the nearest communities on the left (above your
// communities and Discover), a map of them on the right. Starts from your profile city; switches to
// your real location if you've allowed it or tap "Use my location". The position stays in this browser.
export function CommunitiesNearYou({ communities, profile, causeNames, children }: { communities: PlacedCommunity[]; profile: { at: LatLng; label: string } | null; causeNames: Record<string, string>; children: React.ReactNode }) {
  const [origin, setOrigin] = useState<MapOrigin | null>(profile ? { ...profile, source: "profile" } : null)
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

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
  const pins = useMemo(
    () => (near.length ? near : shown).map((c) => ({
      id: c.id, kind: "community" as const, title: c.name, subtitle: `${c.members} ${c.members === 1 ? "member" : "members"}`,
      href: `/communities/${c.slug}`, place: c.location, lat: c.lat, lng: c.lng, cause: c.cause_slug, miles: c.miles, image: communityIconSrc(c.icon_path),
    })) satisfies (MapItem & { miles: number })[],
    [near, shown],
  )

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-3">
        <Panel aria-labelledby="near-you">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <h2 id="near-you" className="h-section">Communities near you</h2>
              <p className="text-sm text-muted-foreground">
                {!origin ? "Share your location to see communities close to you." : origin.source === "device" ? "Around your current location." : `Around ${origin.label}, from your profile.`}
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
            <ul className="grid gap-px bg-border sm:grid-cols-2">
              {shown.map((c) => (
                <li key={c.id} className="bg-card" onMouseEnter={() => setSelected(c.id)} onFocus={() => setSelected(c.id)}>
                  <Link href={`/communities/${c.slug}`} className="flex h-full items-start gap-3 p-4 hover:bg-muted/50">
                    <CommunityMark cause={c.cause_slug} icon={c.icon_path} />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-semibold">{c.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{c.location}</span><span aria-hidden>·</span><span className="shrink-0">{formatMiles(c.miles)}</span></p>
                      <p className="mt-0.5 text-xs text-faint">
                        {[c.cause_slug ? causeNames[c.cause_slug] : null, `${c.members} ${c.members === 1 ? "member" : "members"}`].filter(Boolean).join(" · ")}
                        {c.joined && <span className="ml-1.5 rounded-full bg-leaf-soft px-1.5 py-px font-medium text-leaf">Joined</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/nearby" className="block border-t px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:bg-muted">See volunteering and events near you too</Link>
        </Panel>
        {children}
      </div>
      {/* The map: sticky beside the list on wide screens, first on phones. */}
      <div className="order-first h-[38dvh] min-h-[260px] overflow-hidden rounded-xl border lg:order-none lg:sticky lg:top-20 lg:h-[calc(100dvh-110px)]">
        <LeafletView origin={origin ?? { at: { lat: 39.5, lng: -98.35 }, label: "the United States", source: "none" }} items={pins} radius={null} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  )
}
