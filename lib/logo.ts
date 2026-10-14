// Org logos are uploaded to the org's folder; the server derives the public URL from the path,
// so a logo can never point at an arbitrary external host.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

export function logoPathIsValid(orgId: string, path: string) {
  return new RegExp(`^${orgId}/logo-${UUID}\\.(jpg|jpeg|png|webp)$`).test(path)
}

export function logoPublicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/post-images/${path}`
}
