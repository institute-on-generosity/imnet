// Server-side checks for a new impact stat. The database also requires an http(s) source.
export type StatFields = { label: string; value: string; source_url: string; as_of: string | null }

export function parseStatFields(input: { label: string; value: string; sourceUrl: string; asOf: string }, today: string): { error: string } | { fields: StatFields } {
  const label = input.label.trim()
  const value = input.value.trim()
  if (label.length < 2 || label.length > 80) return { error: "Describe the figure in 2 to 80 characters, like \"Meals served\"." }
  if (value.length < 1 || value.length > 30) return { error: "Enter the figure itself, like 48,200 or 91%." }
  let url: URL
  try {
    url = new URL(input.sourceUrl.trim())
  } catch {
    return { error: "Every figure needs a source link, starting with https://" }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Every figure needs a source link, starting with https://" }
  const asOf = input.asOf.trim()
  if (asOf && (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || asOf > today)) return { error: "The \"as of\" date can't be in the future." }
  return { fields: { label, value, source_url: url.toString(), as_of: asOf || null } }
}
