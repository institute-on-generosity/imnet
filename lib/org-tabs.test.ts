import { describe, expect, it } from "vitest"
import { parseOrgTab } from "./org-tabs"

describe("parseOrgTab", () => {
  it("F-024: known tabs pass through; anything else is Home", () => {
    expect(parseOrgTab("about")).toBe("about")
    expect(parseOrgTab("posts")).toBe("posts")
    expect(parseOrgTab(undefined)).toBe("home")
    expect(parseOrgTab("admin")).toBe("home")
    expect(parseOrgTab(["about"])).toBe("home")
  })
})
