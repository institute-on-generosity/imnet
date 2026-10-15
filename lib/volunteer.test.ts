import { describe, expect, it } from "vitest"
import { hoursLabel, parseHoursFields } from "./volunteer"

const ORG = "00000000-0000-4000-a000-000000000001"
const ok = { orgId: ORG, hours: "2.5", servedOn: "2026-10-10", note: "" }

describe("F-081 volunteer hours", () => {
  it("accepts half hours up to 24, on a past day", () => {
    expect(parseHoursFields(ok, "2026-10-14")).toEqual({ fields: { org_id: ORG, hours: 2.5, served_on: "2026-10-10", note: null } })
  })
  it("rejects zero, over 24, odd fractions, future days and missing orgs", () => {
    for (const hours of ["0", "25", "1.25", "abc"]) expect(parseHoursFields({ ...ok, hours }, "2026-10-14")).toHaveProperty("error")
    expect(parseHoursFields({ ...ok, servedOn: "2026-10-15" }, "2026-10-14")).toHaveProperty("error")
    expect(parseHoursFields({ ...ok, orgId: "" }, "2026-10-14")).toHaveProperty("error")
  })
  it("labels hours", () => {
    expect(hoursLabel(1)).toBe("1 hour")
    expect(hoursLabel(2.5)).toBe("2.5 hours")
    expect(hoursLabel(1240)).toBe("1,240 hours")
  })
})
