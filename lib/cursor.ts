// Feed paging cursor: the last post's (created_at, id). Ties on created_at are broken by id,
// matching the feed order (created_at desc, id desc), so no post is skipped or repeated.
export type Cursor = { createdAt: string; id: string }

export function encodeCursor(c: Cursor) {
  return Buffer.from(`${c.createdAt}|${c.id}`).toString("base64url")
}

export function decodeCursor(raw: unknown): Cursor | null {
  if (typeof raw !== "string" || raw.length > 200) return null
  try {
    const [createdAt, id] = Buffer.from(raw, "base64url").toString("utf8").split("|")
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(createdAt)) return null
    if (!/^[0-9a-f-]{36}$/.test(id)) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

// PostgREST filter for "strictly older than the cursor" under (created_at desc, id desc).
export function olderThan(c: Cursor) {
  return `created_at.lt."${c.createdAt}",and(created_at.eq."${c.createdAt}",id.lt.${c.id})`
}
