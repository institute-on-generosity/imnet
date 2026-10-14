// LinkedIn-style threads: top-level comments newest first, replies under each, oldest first.
export type Comment = {
  id: string
  parent_id: string | null
  body: string
  as_org: boolean
  // Opted-in commenter who logged a gift to the post's org (self-reported; yes/no only).
  donor: boolean
  created_at: string
  user_id: string
  author: { handle: string; display_name: string | null; bio: string | null }
}
export type Thread = Comment & { replies: Comment[] }

export function thread(comments: Comment[]): Thread[] {
  const replies = new Map<string, Comment[]>()
  for (const c of comments) if (c.parent_id) replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c])
  return comments
    .filter((c) => !c.parent_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ ...c, replies: (replies.get(c.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
}

// "3m", "5h", "2d", "3w", then "Mar 4", like LinkedIn's timestamps.
export function ago(iso: string, now = Date.now()) {
  const mins = Math.floor((now - Date.parse(iso)) / 60_000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  if (mins < 10_080) return `${Math.floor(mins / 1440)}d`
  if (mins < 43_200) return `${Math.floor(mins / 10_080)}w`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
