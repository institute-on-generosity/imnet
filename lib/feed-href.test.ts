import { describe, expect, it } from "vitest"
import { feedHref, parseOrgType } from "./feed-href"

describe("feed filters", () => {
  it("F-033: links keep cause and org type together", () => {
    expect(feedHref("/", {})).toBe("/")
    expect(feedHref("/", { cause: "hunger" })).toBe("/?cause=hunger")
    expect(feedHref("/following", { cause: "hunger", type: "foundation" })).toBe("/following?cause=hunger&type=foundation")
  })
  it("F-033: only known org types filter the feed", () => {
    expect(parseOrgType("foundation")).toBe("foundation")
    expect(parseOrgType("nonprofit")).toBe("nonprofit")
    expect(parseOrgType("admin")).toBeUndefined()
    expect(parseOrgType(["foundation"])).toBeUndefined()
  })
})
