import { describe, expect, it } from "vitest"
import { fillDays, total } from "./analytics"

describe("F-067 analytics series", () => {
  it("fills missing days with zeros, oldest first, and ignores days outside the window", () => {
    const s = fillDays([{ day: "2026-10-13", type: "view", n: 5 }, { day: "2026-10-11", type: "share", n: 2 }, { day: "2026-09-01", type: "view", n: 99 }], 3, "2026-10-13")
    expect(s).toEqual([
      { day: "2026-10-11", view: 0, share: 2, donate_click: 0 },
      { day: "2026-10-12", view: 0, share: 0, donate_click: 0 },
      { day: "2026-10-13", view: 5, share: 0, donate_click: 0 },
    ])
    expect(total(s, "view")).toBe(5)
  })
})
