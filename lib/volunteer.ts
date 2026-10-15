// Volunteer hours (F-081): checks for a logged shift.
export type HoursFields = { org_id: string; hours: number; served_on: string; note: string | null }
export type HoursEntry = { id: string; hours: number; served_on: string; note: string | null; confirmed_at: string | null; declined_at: string | null; org: { id: string; slug: string; name: string } }

export function parseHoursFields(input: { orgId: string; hours: string; servedOn: string; note: string }, today: string): { error: string } | { fields: HoursFields } {
  if (!/^[0-9a-f-]{36}$/.test(input.orgId)) return { error: "Pick an organization." }
  const hours = Number(input.hours.trim())
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 || Math.round(hours * 10) !== hours * 10) return { error: "Enter hours from 0.5 to 24, like 3 or 2.5." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.servedOn) || input.servedOn > today) return { error: "Pick the day you volunteered (not in the future)." }
  const note = input.note.trim()
  if (note.length > 300) return { error: "Keep the note under 300 characters." }
  return { fields: { org_id: input.orgId, hours, served_on: input.servedOn, note: note || null } }
}

// "1 hour", "2.5 hours", "1,240 hours"
export const hoursLabel = (h: number) => `${h.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${h === 1 ? "hour" : "hours"}`
