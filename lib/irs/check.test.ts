import { describe, expect, it } from "vitest"
import { checkClaim, displayName, nameSimilarity, overall, type IrsOrg } from "./check"

const year = new Date().getFullYear()
const irs = (o: Partial<IrsOrg> = {}): IrsOrg => ({
  ein: "62-0646012", name: "ST JUDE CHILDRENS RESEARCH HOSPITAL INC", city: "MEMPHIS", state: "TN", subsection: "03", ruling: "1963",
  ntee: { code: "E240", label: "Health Care" }, mission: null, filing: { year: year - 1, form: "990" }, years: [], leaders: [],
  grantsReceived: { count: 1, total: 1, funders: 1, latestYear: year }, grantsGiven: { count: 0, total: 0, latestYear: null }, nombotUrl: "/org/620646012", ...o,
})

describe("F-109: claims checked against IRS records", () => {
  it("matches names despite punctuation, case and suffixes", () => {
    expect(nameSimilarity("St. Jude Children's Research Hospital, Inc.", "ST JUDE CHILDRENS RESEARCH HOSPITAL INC")).toBe(1)
    expect(nameSimilarity("Harbor Table", "ST JUDE CHILDRENS RESEARCH HOSPITAL INC")).toBe(0)
  })
  it("passes a matching, recent 501(c)(3)", () => {
    const c = checkClaim({ org_name: "St. Jude Children's Research Hospital", org_type: "nonprofit" }, irs())
    expect(overall(c)).toBe("ok")
    expect(c.map((x) => x.label)).toContain("501(c)(3) tax-exempt since 1963")
  })
  it("fails a wrong name or a missing record, and warns on type and status mismatches", () => {
    expect(overall(checkClaim({ org_name: "Totally Different Group", org_type: "nonprofit" }, irs()))).toBe("fail")
    expect(overall(checkClaim({ org_name: "St Jude", org_type: "nonprofit" }, null))).toBe("fail")
    expect(checkClaim({ org_name: "St Jude Childrens Research Hospital", org_type: "foundation" }, irs()).some((x) => x.label.startsWith("Claimed as a foundation"))).toBe(true)
    expect(overall(checkClaim({ org_name: "St Jude Childrens Research Hospital", org_type: "nonprofit" }, irs({ subsection: "04" })))).toBe("warn")
    expect(overall(checkClaim({ org_name: "St Jude Childrens Research Hospital", org_type: "nonprofit" }, irs({ filing: { year: 2015, form: "990" } })))).toBe("warn")
  })
  it("shows IRS names in title case", () => {
    expect(displayName("ST JUDE CHILDRENS RESEARCH HOSPITAL INC")).toBe("St Jude Childrens Research Hospital Inc")
    expect(displayName("PRESIDENT/CEO")).toBe("President/CEO")
    expect(displayName("EVP/CHIEF FINANCIAL OFFICER")).toBe("EVP/Chief Financial Officer")
  })
})
