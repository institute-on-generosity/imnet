import { describe, expect, it } from "vitest"
import { escapeLike } from "./search"

describe("escapeLike", () => {
  it("F-025: search treats % and _ as literal characters", () => {
    expect(escapeLike("100% kids_first")).toBe("100\\% kids\\_first")
    expect(escapeLike("back\\slash")).toBe("back\\\\slash")
    expect(escapeLike("Harbor Table")).toBe("Harbor Table")
  })
})
