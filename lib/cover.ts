// Profile covers. Org covers are a path in the org's own folder (database check, like logos after
// B-019); people pick from a shared set of landscapes. URLs are built here, never stored.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const ORG_COVER = new RegExp(`^${UUID}/cover(-${UUID})?\\.(png|jpg|jpeg|webp)$`)
const PERSON_COVER = /^covers\/[a-z0-9-]{1,40}\.webp$/

const publicUrl = (path: string, base = process.env.NEXT_PUBLIC_SUPABASE_URL) => `${base}/storage/v1/object/public/post-images/${path}`

export function orgCoverPathIsValid(orgId: string, path: string) {
  return path.startsWith(`${orgId}/cover-`) && ORG_COVER.test(path)
}

export function orgCoverSrc(value: string | null | undefined, base?: string): string | null {
  if (!value) return null
  if (value.startsWith("blob:")) return value
  return ORG_COVER.test(value) ? publicUrl(value, base) : null
}

export const PERSON_COVERS = [
  ["mountain-lake", "Mountain lake"], ["city-night", "City at night"], ["beach-sunset", "Beach sunset"], ["autumn-road", "Autumn road"],
  ["canyon", "Canyon"], ["snowy-peaks", "Snowy peaks"], ["lavender", "Lavender field"], ["bridge-fog", "Bridge in fog"],
  ["vineyard-dusk", "Vineyard at dusk"], ["waterfall", "Waterfall"], ["tulips", "Tulip field"], ["aurora", "Northern lights"],
  ["terraces", "Green terraces"], ["coast-lighthouse", "Coast and lighthouse"], ["blossom", "Blossoms"], ["prairie", "Prairie"],
] as const

export function personCoverSrc(value: string | null | undefined, base?: string): string | null {
  return value && PERSON_COVER.test(value) ? publicUrl(value, base) : null
}

export const personCoverPath = (key: string) => (PERSON_COVERS.some(([k]) => k === key) ? `covers/${key}.webp` : null)
