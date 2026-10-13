import { describe, expect, it } from "vitest"
import { backers, backersLabel, formatUsd, grantTotals, parseGrantFields } from "./grants"

const A = "00000000-0000-4000-a000-000000000001"
const B = "00000000-0000-4000-a000-000000000003"

describe("grants helpers", () => {
  it("F-034: parses tagged grantees with optional amounts and purposes", () => {
    expect(parseGrantFields([A, B], ["$25,000", ""], [" New freezer ", ""])).toEqual({
      grants: [
        { grantee_id: A, amount_usd: 25000, purpose: "New freezer" },
        { grantee_id: B, amount_usd: null, purpose: null },
      ],
    })
  })

  it("F-034: rejects duplicates, bad ids, fractional or negative amounts, and too many grantees", () => {
    expect(parseGrantFields([A, A], ["", ""], ["", ""])).toHaveProperty("error")
    expect(parseGrantFields(["harbor-table"], [""], [""])).toHaveProperty("error")
    expect(parseGrantFields([A], ["12.50"], [""])).toHaveProperty("error")
    expect(parseGrantFields([A], ["-5"], [""])).toHaveProperty("error")
    const many = Array.from({ length: 11 }, (_, i) => `00000000-0000-4000-a000-0000000000${String(i).padStart(2, "0")}`)
    expect(parseGrantFields(many, [], [])).toHaveProperty("error")
  })

  it("F-035: totals count distinct orgs and sum known amounts", () => {
    const org = (id: string) => ({ id, slug: id, name: id, logo_url: null, org_type: "nonprofit" as const })
    const f = { ...org("f"), org_type: "foundation" as const }
    expect(
      grantTotals(
        [
          { amount_usd: 25000, grantee: org("a"), foundation: f },
          { amount_usd: 5000, grantee: org("a"), foundation: f },
          { amount_usd: null, grantee: org("b"), foundation: f },
        ],
        "grantee",
      ),
    ).toEqual({ count: 2, total: 30000 })
    expect(formatUsd(25000)).toBe("$25,000")
    expect(formatUsd(1_200_000)).toBe("$1.2M")
  })
})

describe("backers", () => {
  const f = (id: string, name: string) => ({ id, slug: id, name, logo_url: null, org_type: "foundation" as const })
  it("F-040: distinct foundations, largest total first, with a readable label", () => {
    const lake = f("l", "Lakeshore"), river = f("r", "Riverside")
    const list = backers([
      { amount_usd: 5000, foundation: river },
      { amount_usd: 25000, foundation: lake },
      { amount_usd: 10000, foundation: river },
    ])
    expect(list.map((x) => x.name)).toEqual(["Lakeshore", "Riverside"])
    expect(backersLabel([])).toBe("")
    expect(backersLabel(["Lakeshore"])).toBe("Backed by Lakeshore")
    expect(backersLabel(["Lakeshore", "Riverside"])).toBe("Co-funded by Lakeshore and Riverside")
    expect(backersLabel(["A", "B", "C"])).toBe("Co-funded by A and 2 other foundations")
  })
})

