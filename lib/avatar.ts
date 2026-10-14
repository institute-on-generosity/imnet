// Illustrated avatars (DiceBear "Notionists", artwork by Zoish, CC0), drawn from a seed.
// A profile's avatar_url is only ever "/avatars/<seed>": our own route, never another host.
export const AVATAR_URL = /^\/avatars\/[a-z0-9_-]{1,40}$/
export const AVATAR_SEED = /^[a-z0-9_-]{1,40}$/

export function isAvatarUrl(url: string | null | undefined): url is string {
  return !!url && AVATAR_URL.test(url)
}
