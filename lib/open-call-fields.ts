// Server-side parsing of the composer's open-call fields (the database re-checks them).
export type CallFields = { call_deadline: string; call_apply_url: string; call_max_award: number | null; call_causes: string[] }

export function parseCallFields(
  input: { deadline: string; applyUrl: string; maxAward: string; causes: string[] },
  today: string,
): { error: string } | { fields: CallFields } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) return { error: "Add an apply-by date." }
  if (input.deadline < today) return { error: "The apply-by date has already passed." }
  let url: URL
  try {
    url = new URL(input.applyUrl.trim())
  } catch {
    return { error: "Add a link to the application, starting with https://" }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Add a link to the application, starting with https://" }
  const raw = input.maxAward.replace(/[$,\s]/g, "")
  const max = raw === "" ? null : Number(raw)
  if (max !== null && (!Number.isInteger(max) || max < 1 || max > 1_000_000_000)) return { error: "Maximum award is whole dollars, like 25000." }
  if (input.causes.some((c) => !/^[a-z0-9-]{2,40}$/.test(c))) return { error: "Pick causes from the list." }
  return { fields: { call_deadline: input.deadline, call_apply_url: url.toString(), call_max_award: max, call_causes: [...new Set(input.causes)] } }
}
