import { describe, expect, it } from "vitest"
import { escapeLike, orFilterTerm, wordStartPattern } from "./search"

describe("escapeLike", () => {
  it("F-025: search treats % and _ as literal characters", () => {
    expect(escapeLike("100% kids_first")).toBe("100\\% kids\\_first")
    expect(escapeLike("back\\slash")).toBe("back\\\\slash")
    expect(escapeLike("Harbor Table")).toBe("Harbor Table")
  })
})

describe("F-068 orFilterTerm", () => {
  it("strips characters that could add PostgREST filter conditions, and escapes wildcards", () => {
    expect(orFilterTerm("dana,handle.neq.x")).toBe("dana handle.neq.x")
    expect(orFilterTerm('a)or(b"\\\\')).toBe("a or b")
    expect(orFilterTerm("50%_off")).toBe("50\\%\\_off")
  })
})

describe("F-068 wordStartPattern", () => {
  it("matches at word starts and escapes regex characters", () => {
    expect(wordStartPattern("river")).toBe("\\mriver")
    expect(wordStartPattern("a.b(c)")).toBe("\\ma\\.b\\(c\\)")
  })
})
