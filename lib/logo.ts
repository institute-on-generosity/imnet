// Org logos are stored as a path in the org's own folder (enforced by a database check);
// the public URL is built here, so a logo can never point at another host (B-019).
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const LOGO = new RegExp(`^${UUID}/logo(-${UUID})?\\.(png|jpg|jpeg|webp)$`)

export function logoPathIsValid(orgId: string, path: string) {
  return path.startsWith(`${orgId}/logo-`) && LOGO.test(path)
}

// Stored logo path -> image URL. Anything else (old absolute URLs, junk) renders no logo.
// blob: is the in-browser preview of a fresh upload.
export function logoSrc(value: string | null | undefined, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!value) return null
  if (value.startsWith("blob:")) return value
  return LOGO.test(value) ? `${supabaseUrl}/storage/v1/object/public/post-images/${value}` : null
}
