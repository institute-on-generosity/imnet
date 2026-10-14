// Server-side checks for a new event. The form sends the local date and time plus the
// browser's UTC offset, so an event at "6 pm" is 6 pm where the staff member is.
export type EventFields = { title: string; starts_at: string; location: string; detail: string | null }
export type OrgEvent = { id: string; title: string; starts_at: string; location: string; detail: string | null }
export type EventWithOrg = OrgEvent & { org: { id: string; slug: string; name: string; logo_url: string | null; org_type: "nonprofit" | "foundation" } }

export function parseEventFields(
  input: { title: string; startsLocal: string; tzOffset: string; location: string; detail: string },
  now: Date,
): { error: string } | { fields: EventFields } {
  const title = input.title.trim()
  if (title.length < 3 || title.length > 120) return { error: "Name the event in 3 to 120 characters." }
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input.startsLocal)
  const offset = Number(input.tzOffset)
  if (!m || !Number.isInteger(offset) || Math.abs(offset) > 840) return { error: "Pick a date and start time." }
  // getTimezoneOffset() is minutes behind UTC (PDT = 420), so UTC = local + offset.
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + offset * 60_000
  if (utc <= now.getTime()) return { error: "The event has to be in the future." }
  const location = input.location.trim()
  if (location.length < 2 || location.length > 200) return { error: "Add where it is, like an address or \"Online\"." }
  const detail = input.detail.trim()
  if (detail.length > 1000) return { error: "Keep the details under 1,000 characters." }
  return { fields: { title, starts_at: new Date(utc).toISOString(), location, detail: detail || null } }
}

// Calendar exports. Events store only a start, so calendars get a 2-hour block.
const DURATION_MS = 2 * 60 * 60 * 1000
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n")

export function eventIcs(e: OrgEvent, orgName: string, url: string, now = new Date()) {
  const start = new Date(e.starts_at)
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//imnet//events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@imnet`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(new Date(start.getTime() + DURATION_MS))}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `DESCRIPTION:${icsText([`Hosted by ${orgName}.`, e.detail ?? "", url].filter(Boolean).join("\n"))}`,
    `URL:${url}`,
    "END:VEVENT", "END:VCALENDAR",
  ]
  return lines.join("\r\n") + "\r\n"
}

export function googleCalendarUrl(e: OrgEvent, orgName: string, url: string) {
  const start = new Date(e.starts_at)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(start)}/${icsDate(new Date(start.getTime() + DURATION_MS))}`,
    location: e.location,
    details: [`Hosted by ${orgName}.`, e.detail ?? "", url].filter(Boolean).join("\n"),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export const mapsUrl = (location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

export const hasStarted = (iso: string, now: Date = new Date()) => new Date(iso).getTime() <= now.getTime()
