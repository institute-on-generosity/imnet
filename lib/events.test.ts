import { describe, expect, it } from "vitest"
import { eventIcs, googleCalendarUrl, mapsUrl, parseEventFields } from "./events"

const now = new Date("2026-10-13T12:00:00Z")
const ok = { title: "Planting day", startsLocal: "2026-11-07T09:30", tzOffset: "420", location: "Delmar St and 5th", detail: "" }

describe("F-058 event fields", () => {
  it("converts local time with the browser offset to UTC", () => {
    expect(parseEventFields(ok, now)).toEqual({ fields: { title: "Planting day", starts_at: "2026-11-07T16:30:00.000Z", location: "Delmar St and 5th", detail: null } })
    expect(parseEventFields({ ...ok, tzOffset: "-60" }, now)).toMatchObject({ fields: { starts_at: "2026-11-07T08:30:00.000Z" } })
  })
  it("rejects past events, bad times, missing location and short titles", () => {
    expect(parseEventFields({ ...ok, startsLocal: "2026-10-13T04:00" }, now)).toHaveProperty("error")
    expect(parseEventFields({ ...ok, startsLocal: "tomorrow" }, now)).toHaveProperty("error")
    expect(parseEventFields({ ...ok, tzOffset: "abc" }, now)).toHaveProperty("error")
    expect(parseEventFields({ ...ok, location: " " }, now)).toHaveProperty("error")
    expect(parseEventFields({ ...ok, title: "ab" }, now)).toHaveProperty("error")
  })
})

describe("F-074 calendar exports", () => {
  const e = { id: "e1", title: "Dinner, tour; and soup", starts_at: "2026-10-17T00:00:00.000Z", location: "12 Pier St, Portland", detail: "Bring a friend\nAll welcome" }
  it("builds an .ics with UTC times, a 2-hour block and escaped text", () => {
    const ics = eventIcs(e, "Harbor Table", "https://imnet.org/e/e1", new Date("2026-10-14T12:00:00Z"))
    expect(ics).toContain("DTSTART:20261017T000000Z")
    expect(ics).toContain("DTEND:20261017T020000Z")
    expect(ics).toContain("SUMMARY:Dinner\\, tour\\; and soup")
    expect(ics).toContain("LOCATION:12 Pier St\\, Portland")
    expect(ics).toContain("Bring a friend\\nAll welcome")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
  })
  it("builds Google Calendar and Maps links", () => {
    const g = new URL(googleCalendarUrl(e, "Harbor Table", "https://imnet.org/e/e1"))
    expect(g.searchParams.get("dates")).toBe("20261017T000000Z/20261017T020000Z")
    expect(g.searchParams.get("text")).toBe("Dinner, tour; and soup")
    expect(mapsUrl("12 Pier St, Portland")).toBe("https://www.google.com/maps/search/?api=1&query=12%20Pier%20St%2C%20Portland")
  })
})
