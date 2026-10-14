// Server-side checks for photos attached to a post. Uploads happen in the browser,
// so the server re-validates every path and alt text before saving.
export const MAX_IMAGES = 4
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

// folder: an org id, or "people/<user id>" for donor posts (F-080).
export function validateImages(folder: string, paths: string[], alts: string[]): { error: string } | { paths: string[]; alts: string[] } {
  if (paths.length > MAX_IMAGES) return { error: `Add up to ${MAX_IMAGES} photos.` }
  if (alts.length !== paths.length) return { error: "Each photo needs a description." }
  const pathRe = new RegExp(`^${folder}/${UUID}\\.(jpg|jpeg|png|webp)$`)
  if (!paths.every((p) => pathRe.test(p))) return { error: "A photo upload didn't finish. Remove it and try again." }
  const clean = alts.map((a) => a.trim())
  if (clean.some((a) => a.length === 0)) return { error: "Describe each photo for people using screen readers." }
  if (clean.some((a) => a.length > 300)) return { error: "Keep photo descriptions under 300 characters." }
  return { paths, alts: clean }
}
