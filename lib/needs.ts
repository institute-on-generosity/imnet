// Server-side checks for a new need. The database also limits kinds and requires an http(s) or mailto link.
export const NEED_KINDS = ["item", "volunteer", "funding"] as const
export type NeedKind = (typeof NEED_KINDS)[number]
export const NEED_KIND_LABEL: Record<NeedKind, string> = { item: "Items", volunteer: "Volunteers", funding: "Funding" }

export type NeedFields = { kind: NeedKind; title: string; detail: string | null; help_url: string }

// A bare email becomes a mailto: link, so staff can paste either.
export function parseNeedFields(input: { kind: string; title: string; detail: string; helpUrl: string }): { error: string } | { fields: NeedFields } {
  if (!NEED_KINDS.includes(input.kind as NeedKind)) return { error: "Choose items, volunteers or funding." }
  const title = input.title.trim()
  if (title.length < 3 || title.length > 120) return { error: "Name the need in 3 to 120 characters, like \"Winter coats, adult sizes\"." }
  const detail = input.detail.trim()
  if (detail.length > 500) return { error: "Keep the details under 500 characters." }
  const raw = input.helpUrl.trim()
  const help = /^[^\s@/:]+@[^\s@/]+\.[^\s@/]+$/.test(raw) ? `mailto:${raw}` : raw
  let url: URL
  try {
    url = new URL(help)
  } catch {
    return { error: "Add a link or email where people can help." }
  }
  if (!["https:", "http:", "mailto:"].includes(url.protocol)) return { error: "Add a link or email where people can help." }
  return { fields: { kind: input.kind as NeedKind, title, detail: detail || null, help_url: url.toString() } }
}

export type Need = { id: string; kind: NeedKind; title: string; detail: string | null; help_url: string; met_at: string | null; created_at: string }

// Recently met needs stay up for a month: proof that asking works.
export const MET_SHOWN_DAYS = 30
