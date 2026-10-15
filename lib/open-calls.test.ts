import { afterEach, describe, expect, it, vi } from "vitest"
import { callStatus, deadlineTodayISO } from "./open-calls"

describe("callStatus", () => {
  it("F-039: open, closing soon in the last 7 days (deadline day included), closed after", () => {
    expect(callStatus("2026-11-30", "2026-10-13")).toBe("open")
    expect(callStatus("2026-10-20", "2026-10-13")).toBe("closing_soon")
    expect(callStatus("2026-10-13", "2026-10-13")).toBe("closing_soon")
    expect(callStatus("2026-10-12", "2026-10-13")).toBe("closed")
  })
})

describe("B-036: deadlines stay open until the day ends everywhere", () => {
  afterEach(() => vi.useRealTimers())
  it("an Oct 25 deadline is still open at 8pm Pacific on Oct 25 (Oct 26 in UTC)", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-26T03:00:00Z"))
    expect(callStatus("2026-10-25", deadlineTodayISO())).not.toBe("closed")
  })
  it("closes once the day has ended everywhere", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-26T13:00:00Z"))
    expect(callStatus("2026-10-25", deadlineTodayISO())).toBe("closed")
  })
})
