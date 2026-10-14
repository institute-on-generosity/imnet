import { describe, expect, it } from "vitest"
import { isAvatarUrl } from "./avatar"

describe("F-070 avatar urls", () => {
  it("accepts only our own /avatars/<seed> route", () => {
    expect(isAvatarUrl("/avatars/maya_nguyen")).toBe(true)
    expect(isAvatarUrl("https://evil.example/pixel.gif")).toBe(false)
    expect(isAvatarUrl("//evil.example/a")).toBe(false)
    expect(isAvatarUrl("/avatars/../admin")).toBe(false)
    expect(isAvatarUrl(null)).toBe(false)
  })
})
