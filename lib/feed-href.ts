import type { OrgType } from "@/lib/types"

// Feed links keep both filters: cause and org type.
export function feedHref(basePath: string, f: { cause?: string; type?: OrgType }) {
  const params = new URLSearchParams()
  if (f.cause) params.set("cause", f.cause)
  if (f.type) params.set("type", f.type)
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}

export function parseOrgType(v: unknown): OrgType | undefined {
  return v === "nonprofit" || v === "foundation" ? v : undefined
}
