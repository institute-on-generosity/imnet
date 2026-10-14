import { describe, expect, it } from "vitest"
import { parseGiftFields, summarize, type Gift } from "./gifts"

const ORG = "00000000-0000-4000-a000-000000000001"
const ok = { orgId: ORG, amount: "$1,250", givenOn: "2026-10-01", note: "" }

describe("F-052 gift fields", () => {
  it("accepts whole dollars with $ and commas", () => {
    expect(parseGiftFields(ok, "2026-10-13")).toEqual({ fields: { org_id: ORG, amount_usd: 1250, given_on: "2026-10-01", note: null } })
  })
  it("rejects cents, zero, future dates and a missing org", () => {
    expect(parseGiftFields({ ...ok, amount: "12.50" }, "2026-10-13")).toHaveProperty("error")
    expect(parseGiftFields({ ...ok, amount: "0" }, "2026-10-13")).toHaveProperty("error")
    expect(parseGiftFields({ ...ok, givenOn: "2026-10-14" }, "2026-10-13")).toHaveProperty("error")
    expect(parseGiftFields({ ...ok, orgId: "" }, "2026-10-13")).toHaveProperty("error")
  })
})

describe("F-052 summary", () => {
  const org = (n: number) => ({ id: String(n), slug: `o${n}`, name: `Org ${n}` })
  const g = (amount_usd: number, given_on: string, o: number): Gift => ({ id: given_on + o, amount_usd, given_on, note: null, org: org(o) })
  it("totals by year, newest first, and by org, largest first", () => {
    const s = summarize([g(50, "2026-01-02", 1), g(100, "2026-05-01", 2), g(25, "2026-06-01", 1), g(10, "2025-12-31", 1)])
    expect(s.map((y) => [y.year, y.total])).toEqual([["2026", 175], ["2025", 10]])
    expect(s[0].orgs.map((o) => [o.name, o.total])).toEqual([["Org 2", 100], ["Org 1", 75]])
  })
})
