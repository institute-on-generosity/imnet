import { describe, expect, it } from "vitest"
import { callStatus } from "./open-calls"

describe("callStatus", () => {
  it("F-039: open, closing soon in the last 7 days (deadline day included), closed after", () => {
    expect(callStatus("2026-11-30", "2026-10-13")).toBe("open")
    expect(callStatus("2026-10-20", "2026-10-13")).toBe("closing_soon")
    expect(callStatus("2026-10-13", "2026-10-13")).toBe("closing_soon")
    expect(callStatus("2026-10-12", "2026-10-13")).toBe("closed")
  })
})
