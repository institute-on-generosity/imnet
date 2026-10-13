import { describe, expect, it } from "vitest"
import { portfolioContext } from "./portfolio"

const lakeshore = { id: "f1", slug: "lakeshore", name: "Lakeshore", logo_url: null, org_type: "foundation" as const }
const report = (id: string, orgId: string) => ({ id, org_id: orgId, report_grant: { id: "g", amount_usd: null, purpose: null, foundation: lakeshore } })

describe("portfolioContext", () => {
  it("F-037: labels grant reports that show up only because you follow the funding foundation", () => {
    const posts = [report("p1", "harbor"), report("p2", "riverbend"), { id: "p3", org_id: "harbor", report_grant: null }]
    // Follows Lakeshore and Riverbend: p1 is portfolio-only, p2 you'd see anyway, p3 isn't a report.
    const ctx = portfolioContext(posts, new Set(["f1", "riverbend"]))
    expect([...ctx.keys()]).toEqual(["p1"])
    expect(ctx.get("p1")?.name).toBe("Lakeshore")
  })

  it("F-037: nothing is labeled when you don't follow the foundation", () => {
    expect(portfolioContext([report("p1", "harbor")], new Set(["riverbend"])).size).toBe(0)
  })
})
