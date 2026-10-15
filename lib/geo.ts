// F-101 Distances for the Near you map, computed in the browser (your location never leaves it).

export type LatLng = { lat: number; lng: number }
export type MapKind = "volunteer" | "event" | "community" | "nonprofit" | "foundation"
export type MapItem = LatLng & {
  id: string
  kind: MapKind
  title: string
  subtitle: string // who, and when or how many
  href: string
  place: string | null
  logo?: { name: string; logo_url: string | null; org_type?: "nonprofit" | "foundation" }
  cause: string | null
  image?: string | null // community icon or org logo, shown on the pin (F-103)
}

const R_MILES = 3958.8
const rad = (d: number) => (d * Math.PI) / 180

// Great-circle distance in miles.
export function milesBetween(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatMiles(mi: number) {
  if (mi < 0.1) return "Here"
  if (mi < 10) return `${mi.toFixed(1)} mi`
  return `${Math.round(mi).toLocaleString("en-US")} mi`
}

export const RADII = [10, 25, 50, 100] as const
export const US_CENTER: LatLng = { lat: 39.5, lng: -98.35 }
