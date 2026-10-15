"use client"

import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet"
import "leaflet/dist/leaflet.css"
import { Building2, CalendarDays, HandHelping, Landmark, LocateFixed, MapPin, UsersRound } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "@/components/intent-link"
import { formatMiles, milesBetween, RADII, US_CENTER, type LatLng, type MapItem, type MapKind } from "@/lib/geo"
import { cn } from "@/lib/utils"
import { OrgMark } from "./org-mark"

// label: the filter chip; one: a single item in the list.
const KINDS: Record<MapKind, { label: string; one: string; color: string; Icon: typeof MapPin }> = {
  volunteer: { label: "Volunteer", one: "Volunteer", color: "#1f7a5a", Icon: HandHelping },
  event: { label: "Events", one: "Event", color: "#14213d", Icon: CalendarDays },
  community: { label: "Communities", one: "Community", color: "#d99a00", Icon: UsersRound },
  nonprofit: { label: "Nonprofits", one: "Nonprofit", color: "#0e7490", Icon: Building2 },
  foundation: { label: "Foundations", one: "Foundation", color: "#7c3aed", Icon: Landmark },
}
type Origin = { at: LatLng; label: string; source: "device" | "profile" | "none" }

// F-101: what's happening around you. Your location is asked for only when you tap "Use my
// location", stays in this browser, and distances are computed here.
export function NearMap({ items, profile }: { items: MapItem[]; profile: { at: LatLng; label: string } | null }) {
  const [origin, setOrigin] = useState<Origin>(profile ? { ...profile, source: "profile" } : { at: US_CENTER, label: "the United States", source: "none" })
  const [kinds, setKinds] = useState<Set<MapKind>>(new Set(["volunteer", "event", "community", "nonprofit", "foundation"]))
  const [radius, setRadius] = useState<number | null>(profile ? 25 : null)
  const [selected, setSelected] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const ranked = useMemo(
    () => items.filter((i) => kinds.has(i.kind)).map((i) => ({ ...i, miles: milesBetween(origin.at, i) })).sort((a, b) => a.miles - b.miles),
    [items, kinds, origin],
  )
  // Stable lists, so selecting a pin doesn't rebuild the map (and close its popup).
  const visible = useMemo(() => (radius === null ? ranked : ranked.filter((i) => i.miles <= radius)), [ranked, radius])
  const pins = useMemo(() => visible.slice(0, 200), [visible])
  const nearest = ranked[0]

  const locate = () => {
    if (!navigator.geolocation) return setLocError("This browser can't share a location.")
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ at: { lat: pos.coords.latitude, lng: pos.coords.longitude }, label: "you", source: "device" })
        setRadius((r) => r ?? 25)
        setLocating(false)
      },
      () => {
        setLocError("Location is off for this site. Showing places near your profile city instead.")
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  // If you've already allowed location for imnet, use it without asking again.
  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" }).then((p) => { if (p.state === "granted") locate() }).catch(() => {})
  }, [])

  const toggle = (k: MapKind) => setKinds((s) => { const n = new Set(s); if (n.has(k) && n.size > 1) n.delete(k); else n.add(k); return n })

  return (
    <div className="grid gap-3 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section aria-labelledby="near-title" className="order-2 min-w-0 rounded-xl border bg-card lg:order-1">
        <div className="space-y-3 border-b p-4">
          <div>
            <h1 id="near-title" className="h-page">Near you</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {origin.source === "device" ? "Around your current location." : origin.source === "profile" ? `Around ${origin.label}, from your profile.` : "Everywhere. Share your location to see what's close."}
            </p>
          </div>
          <button type="button" onClick={locate} disabled={locating}
            className={cn("inline-flex h-9 items-center gap-2 rounded-full border pr-3.5 pl-3 text-sm font-semibold transition-[color,background-color,transform] active:scale-95",
              origin.source === "device" ? "border-leaf/40 bg-leaf-soft text-leaf" : "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}>
            <LocateFixed className="size-4" aria-hidden />{locating ? "Finding you..." : origin.source === "device" ? "Using your location" : "Use my location"}
          </button>
          {locError && <p role="status" className="text-xs text-muted-foreground">{locError}</p>}
          <p className="text-[11px] text-faint">Your location stays in this browser. imnet never stores it.</p>

          <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
            {(Object.keys(KINDS) as MapKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={kinds.has(k)} onClick={() => toggle(k)}
                className={cn("inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-[11px] text-sm transition-colors", kinds.has(k) ? "border-foreground/25 bg-card font-medium" : "text-faint hover:text-foreground")}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: kinds.has(k) ? KINDS[k].color : "transparent", boxShadow: `inset 0 0 0 1.5px ${KINDS[k].color}` }} aria-hidden />
                {KINDS[k].label}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Distance" className="flex flex-wrap gap-1.5 text-sm">
            {[...RADII, null].map((r) => (
              <button key={String(r)} type="button" role="radio" aria-checked={radius === r} onClick={() => setRadius(r)}
                className={cn("rounded-full px-3 py-1 transition-colors", radius === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {r === null ? "Any distance" : `${r} mi`}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-4 text-sm">
            <p className="text-muted-foreground">Nothing within {radius} miles yet.</p>
            {nearest && (
              <p className="mt-1">The nearest is <Link href={nearest.href} className="font-semibold hover:underline">{nearest.title}</Link> in {nearest.place ?? "another city"}, {formatMiles(nearest.miles)} away.</p>
            )}
            <button type="button" onClick={() => setRadius(null)} className="mt-3 font-semibold text-leaf hover:underline">Show everything, nearest first</button>
          </div>
        ) : (
          <>
            <p className="px-4 pt-3 text-xs text-faint">{visible.length} {visible.length === 1 ? "place" : "places"}, nearest first</p>
            <ul className="max-h-[60dvh] divide-y overflow-y-auto lg:max-h-[calc(100dvh-460px)]">
              {visible.slice(0, 100).map((i) => {
                const K = KINDS[i.kind]
                return (
                  <li key={i.id} id={`near-${i.id}`} onMouseEnter={() => setSelected(i.id)} onFocus={() => setSelected(i.id)}
                    className={cn("relative flex gap-3 px-4 py-3 transition-colors", selected === i.id ? "bg-muted/70" : "hover:bg-muted/40")}>
                    {i.logo ? <span className="mt-0.5"><OrgMark org={i.logo} size="sm" /></span> : i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" className="mt-0.5 size-6 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-white" style={{ backgroundColor: K.color }} aria-hidden><K.Icon className="size-3.5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={i.href} className="line-clamp-2 text-sm leading-snug font-semibold after:absolute after:inset-0 hover:underline">{i.title}</Link>
                      <p className="truncate text-xs text-muted-foreground">{i.subtitle}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: K.color }} aria-hidden />{K.one}
                        <span aria-hidden>·</span>{formatMiles(i.miles)}{i.place && <><span aria-hidden>·</span><span className="truncate">{i.place}</span></>}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <div className="order-1 h-[46dvh] min-h-[300px] overflow-hidden rounded-xl border lg:order-2 lg:sticky lg:top-20 lg:h-[calc(100dvh-110px)]">
        <LeafletView origin={origin} items={pins} radius={radius} selected={selected} onSelect={(id) => { setSelected(id); document.getElementById(`near-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }) }} />
      </div>
    </div>
  )
}

// The map itself. Leaflet touches window, so it loads in the browser only.
export type MapOrigin = Origin
export function LeafletView({ origin, items, radius, selected, onSelect }: { origin: Origin; items: (MapItem & { miles: number })[]; radius: number | null; selected: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const layer = useRef<LayerGroup | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const L = useRef<typeof import("leaflet") | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return
      L.current = mod
      const m = mod.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView([origin.at.lat, origin.at.lng], origin.source === "none" ? 4 : 10)
      // OpenStreetMap's standard tiles (no key; attribution required). Softened in CSS to fit imnet.
      mod.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m)
      layer.current = mod.layerGroup().addTo(m)
      map.current = m
      setReady(true)
    })
    return () => { cancelled = true; map.current?.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pins, the "you" dot and the radius ring; then fit the view.
  useEffect(() => {
    const mod = L.current, m = map.current, g = layer.current
    if (!ready || !mod || !m || !g) return
    g.clearLayers()
    markers.current.clear()
    if (origin.source !== "none") {
      mod.marker([origin.at.lat, origin.at.lng], { icon: mod.divIcon({ className: "", html: '<span class="near-you" aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false, interactive: false }).addTo(g)
      if (radius !== null) mod.circle([origin.at.lat, origin.at.lng], { radius: radius * 1609.34, color: "#1f7a5a", weight: 1, opacity: 0.5, fillOpacity: 0.04 }).addTo(g)
    }
    // Places in the same city share a point; fan them out in a small ring (in pixels, so it holds
    // at every zoom) so each pin stays visible and clickable.
    const spots = new Map<string, string[]>()
    for (const i of items) { const k = `${i.lat.toFixed(4)},${i.lng.toFixed(4)}`; spots.set(k, [...(spots.get(k) ?? []), i.id]) }
    const fan = (i: MapItem): [number, number] => {
      const group = spots.get(`${i.lat.toFixed(4)},${i.lng.toFixed(4)}`)!
      if (group.length < 2) return [0, 0]
      // Fill concentric rings, each holding as many 40px slots as fit around it.
      let idx = group.indexOf(i.id), ring = 0
      for (;;) {
        const r = 24 + ring * 38, cap = Math.max(4, Math.floor((2 * Math.PI * r) / 40))
        const inRing = Math.min(cap, group.length - (group.indexOf(i.id) - idx))
        if (idx < cap) { const t = (idx / inRing) * Math.PI * 2 - Math.PI / 2; return [Math.round(Math.cos(t) * r), Math.round(Math.sin(t) * r)] }
        idx -= cap; ring++
      }
    }
    for (const i of items) {
      const color = KINDS[i.kind].color
      const [dx, dy] = fan(i)
      // F-103: a picture pin (community icon or org logo) ringed in its kind's color; a dot otherwise.
      // Image URLs come from communityIconSrc/logoSrc, which only build our own storage URLs.
      const html = i.image
        ? `<span class="near-pin near-pin-img" style="--pin:${color};background-image:url('${i.image}')"></span>`
        : `<span class="near-pin" style="--pin:${color}"></span>`
      const size = i.image ? 36 : 22
      const mk = mod.marker([i.lat, i.lng], {
        title: i.title,
        icon: mod.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2 - dx, size / 2 - dy] }),
      })
      const popup = document.createElement("div")
      popup.className = "near-popup"
      const title = document.createElement("a"); title.href = i.href; title.textContent = i.title
      const sub = document.createElement("p"); sub.textContent = `${i.subtitle} · ${formatMiles(i.miles)}`
      popup.append(title, sub)
      mk.bindPopup(popup, { closeButton: false, offset: [0, -6] })
      mk.on("click", () => onSelect(i.id))
      mk.addTo(g)
      markers.current.set(i.id, mk)
    }
    const pts: [number, number][] = items.slice(0, 25).map((i) => [i.lat, i.lng])
    if (origin.source !== "none") pts.push([origin.at.lat, origin.at.lng])
    if (radius !== null && origin.source !== "none") m.fitBounds(mod.latLng(origin.at.lat, origin.at.lng).toBounds(radius * 1609.34 * 2), { padding: [20, 20] })
    else if (pts.length > 1) m.fitBounds(mod.latLngBounds(pts), { padding: [30, 30], maxZoom: 12 })
    else m.setView([origin.at.lat, origin.at.lng], origin.source === "none" ? 4 : 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, items, origin, radius])

  // Highlight the selected pin.
  useEffect(() => {
    for (const [id, mk] of markers.current) mk.getElement()?.classList.toggle("near-pin-selected", id === selected)
  }, [selected, items])

  return <div ref={el} className="size-full bg-muted" role="application" aria-label="Map of places near you" />
}
