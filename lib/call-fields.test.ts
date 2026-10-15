import { describe, expect, it } from "vitest"
import { parseCallActionFields } from "./call-fields"

describe("F-084 call fields", () => {
  it("accepts a link, an optional future date and (donations only) a goal", () => {
    expect(parseCallActionFields("call_donations", { url: "https://harbor.example.org/give", date: "2026-11-30", goal: "$5,000" }, "2026-10-14"))
      .toEqual({ fields: { action_url: "https://harbor.example.org/give", action_date: "2026-11-30", goal_usd: 5000 } })
    expect(parseCallActionFields("call_volunteers", { url: "https://x.example.org/s", date: "", goal: "500" }, "2026-10-14"))
      .toEqual({ fields: { action_url: "https://x.example.org/s", action_date: null, goal_usd: null } })
  })
  it("rejects missing or unsafe links, past dates and bad goals", () => {
    expect(parseCallActionFields("call_volunteers", { url: "", date: "", goal: "" }, "2026-10-14")).toHaveProperty("error")
    expect(parseCallActionFields("call_volunteers", { url: "javascript:alert(1)", date: "", goal: "" }, "2026-10-14")).toHaveProperty("error")
    expect(parseCallActionFields("call_volunteers", { url: "https://x.org", date: "2026-10-01", goal: "" }, "2026-10-14")).toHaveProperty("error")
    expect(parseCallActionFields("call_donations", { url: "https://x.org", date: "", goal: "12.5" }, "2026-10-14")).toHaveProperty("error")
  })
})
