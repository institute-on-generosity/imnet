// F-103 Community icons live in the community's own folder (enforced by a database check); the
// public URL is built here so an icon can never point at another host (as with org logos, B-019).
const ICON = /^communities\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/icon(-[0-9a-f-]{36})?\.(png|jpg|jpeg|webp)$/

export function communityIconSrc(path: string | null | undefined, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  return path && ICON.test(path) ? `${supabaseUrl}/storage/v1/object/public/post-images/${path}` : null
}
