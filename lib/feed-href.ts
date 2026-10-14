import type { OrgType } from "@/lib/types"

// Who's posting: an org type, or donors (people, F-079).
export type FeedType = OrgType | "donor"

// Feed links keep both filters: cause and org type.
export function feedHref(basePath: string, f: { cause?: string; type?: FeedType; before?: string }) {
  const params = new URLSearchParams()
  if (f.cause) params.set("cause", f.cause)
  if (f.type) params.set("type", f.type)
  if (f.before) params.set("before", f.before)
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}

export function parseOrgType(v: unknown): FeedType | undefined {
  return v === "nonprofit" || v === "foundation" || v === "donor" ? v : undefined
}
