// Status of an open call on a given day (dates are YYYY-MM-DD; deadline day is still open).
export type CallStatus = "open" | "closing_soon" | "closed"

export function callStatus(deadline: string, today: string): CallStatus {
  if (deadline < today) return "closed"
  const days = (Date.parse(deadline) - Date.parse(today)) / 86_400_000
  return days <= 7 ? "closing_soon" : "open"
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// B-036: for showing deadlines. A deadline day stays open until it has ended everywhere
// ("anywhere on Earth", UTC-12), so US evenings never see a call close a day early.
export function deadlineTodayISO() {
  return new Date(Date.now() - 12 * 3_600_000).toISOString().slice(0, 10)
}

export const formatDeadline = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
