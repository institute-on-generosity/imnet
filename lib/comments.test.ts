import { describe, expect, it } from "vitest"
import { ago, thread, type Comment } from "./comments"

const c = (id: string, created_at: string, parent_id: string | null = null): Comment => ({
  id, parent_id, created_at, body: id, as_org: false, donor: false, user_id: "u", author: { handle: "h", display_name: null, bio: null },
})

describe("F-063 threads", () => {
  it("puts top-level comments newest first and replies oldest first under their parent", () => {
    const t = thread([c("a", "2026-10-01"), c("b", "2026-10-03"), c("a2", "2026-10-05", "a"), c("a1", "2026-10-02", "a")])
    expect(t.map((x) => x.id)).toEqual(["b", "a"])
    expect(t[1].replies.map((x) => x.id)).toEqual(["a1", "a2"])
  })
  it("formats LinkedIn-style ages", () => {
    const now = Date.parse("2026-10-13T12:00:00Z")
    expect(ago("2026-10-13T11:58:00Z", now)).toBe("2m")
    expect(ago("2026-10-13T07:00:00Z", now)).toBe("5h")
    expect(ago("2026-10-10T12:00:00Z", now)).toBe("3d")
    expect(ago("2026-09-25T12:00:00Z", now)).toBe("2w")
  })
})
