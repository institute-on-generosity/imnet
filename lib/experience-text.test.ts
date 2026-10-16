import { describe, expect, it } from "vitest"
import { experienceVerb } from "./experience-text"

describe("F-119: experiences say how much", () => {
  it("adds hours and dollars when shared", () => {
    expect(experienceVerb({ kind: "volunteered", hours: 3, amount_usd: null })).toBe("volunteered 3 hrs at")
    expect(experienceVerb({ kind: "volunteered", hours: 2.5, amount_usd: null })).toBe("volunteered 2.5 hrs at")
    expect(experienceVerb({ kind: "volunteered", hours: 1, amount_usd: null })).toBe("volunteered 1 hr at")
    expect(experienceVerb({ kind: "gave", hours: null, amount_usd: 25000 })).toBe("gave $25,000 to")
    expect(experienceVerb({ kind: "gave", hours: null, amount_usd: null })).toBe("gave to")
    expect(experienceVerb({ kind: "attended", hours: null, amount_usd: null })).toBe("went to an event at")
  })
})
