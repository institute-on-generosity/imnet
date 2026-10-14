import { describe, expect, it } from "vitest"
import { parseStatFields } from "./impact-stat-fields"

const ok = { label: " Meals served ", value: "48,200", sourceUrl: "https://example.org/report", asOf: "2026-06-30" }

describe("parseStatFields", () => {
  it("F-043: accepts a figure with a source and optional as-of date", () => {
    expect(parseStatFields(ok, "2026-10-13")).toEqual({
      fields: { label: "Meals served", value: "48,200", source_url: "https://example.org/report", as_of: "2026-06-30" },
    })
    expect(parseStatFields({ ...ok, asOf: "" }, "2026-10-13")).toMatchObject({ fields: { as_of: null } })
  })

  it("F-043: no source, no stat; no future dates; no empty figures", () => {
    expect(parseStatFields({ ...ok, sourceUrl: "" }, "2026-10-13")).toHaveProperty("error")
    expect(parseStatFields({ ...ok, sourceUrl: "javascript:alert(1)" }, "2026-10-13")).toHaveProperty("error")
    expect(parseStatFields({ ...ok, asOf: "2027-01-01" }, "2026-10-13")).toHaveProperty("error")
    expect(parseStatFields({ ...ok, value: "  " }, "2026-10-13")).toHaveProperty("error")
    expect(parseStatFields({ ...ok, label: "x" }, "2026-10-13")).toHaveProperty("error")
  })
})
