import { describe, expect, it } from "vitest"
import { footnotes } from "./footnotes"

describe("footnotes", () => {
  it("F-021: each distinct source is numbered once, in order of first use", () => {
    const { marks, sources } = footnotes([
      { source_url: "https://a.org/report", as_of: "2026-06-30" },
      { source_url: "https://b.org/data", as_of: null },
      { source_url: "https://a.org/report", as_of: "2026-06-30" },
    ])
    expect(marks).toEqual([1, 2, 1])
    expect(sources).toEqual([
      { url: "https://a.org/report", asOf: "2026-06-30" },
      { url: "https://b.org/data", asOf: null },
    ])
  })

  it("F-021: no stats, no footnotes", () => {
    expect(footnotes([])).toEqual({ marks: [], sources: [] })
  })
})
