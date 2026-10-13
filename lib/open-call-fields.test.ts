import { describe, expect, it } from "vitest"
import { parseCallFields } from "./open-call-fields"

const base = { deadline: "2026-11-30", applyUrl: "https://example.org/apply", maxAward: "$25,000", causes: ["hunger", "hunger", "housing"] }

describe("parseCallFields", () => {
  it("F-039: parses a valid call (dedupes causes, whole-dollar max award)", () => {
    expect(parseCallFields(base, "2026-10-13")).toEqual({
      fields: { call_deadline: "2026-11-30", call_apply_url: "https://example.org/apply", call_max_award: 25000, call_causes: ["hunger", "housing"] },
    })
    expect(parseCallFields({ ...base, maxAward: "" }, "2026-10-13")).toMatchObject({ fields: { call_max_award: null } })
  })

  it("F-039: rejects past deadlines, non-web links, fractional awards and odd causes", () => {
    expect(parseCallFields({ ...base, deadline: "" }, "2026-10-13")).toHaveProperty("error")
    expect(parseCallFields({ ...base, deadline: "2026-10-01" }, "2026-10-13")).toHaveProperty("error")
    expect(parseCallFields({ ...base, applyUrl: "javascript:alert(1)" }, "2026-10-13")).toHaveProperty("error")
    expect(parseCallFields({ ...base, applyUrl: "not a url" }, "2026-10-13")).toHaveProperty("error")
    expect(parseCallFields({ ...base, maxAward: "99.5" }, "2026-10-13")).toHaveProperty("error")
    expect(parseCallFields({ ...base, causes: ["<script>"] }, "2026-10-13")).toHaveProperty("error")
  })
})
