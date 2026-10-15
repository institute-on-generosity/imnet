// Calls for volunteers and donations (F-084): server checks for the composer fields.
export type CallKind = "call_volunteers" | "call_donations"
export type CallActionFields = { action_url: string; action_date: string | null; goal_usd: number | null }

export function parseCallActionFields(kind: CallKind, input: { url: string; date: string; goal: string }, today: string): { error: string } | { fields: CallActionFields } {
  let url: URL
  try {
    url = new URL(input.url.trim())
  } catch {
    return { error: kind === "call_volunteers" ? "Add the sign-up link, starting with https://" : "Add the donate link, starting with https://" }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "Links must start with https://" }
  const date = input.date.trim()
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today)) return { error: "Pick a date that hasn't passed." }
  let goal: number | null = null
  if (kind === "call_donations" && input.goal.trim()) {
    goal = Number(input.goal.replace(/[$,\s]/g, ""))
    if (!Number.isInteger(goal) || goal < 1 || goal > 100_000_000) return { error: "Enter the goal in whole dollars, like 5,000." }
  }
  return { fields: { action_url: url.toString(), action_date: date || null, goal_usd: goal } }
}
