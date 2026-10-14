import { describe, expect, it } from "vitest"
import { parseEventFields } from "./events"

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
