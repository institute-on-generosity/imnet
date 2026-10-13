import { describe, expect, it } from "vitest"
import { decodeCursor, encodeCursor, olderThan } from "./cursor"

const c = { createdAt: "2026-10-12T10:00:00.123456+00:00", id: "00000000-0000-4000-a000-000000000001" }

describe("feed cursor", () => {
  it("F-041: round-trips and builds a tie-safe 'older than' filter", () => {
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
    expect(olderThan(c)).toBe(`created_at.lt."${c.createdAt}",and(created_at.eq."${c.createdAt}",id.lt.${c.id})`)
  })

  it("F-041: rejects tampered or junk cursors (no filter injection)", () => {
    expect(decodeCursor(undefined)).toBeNull()
    expect(decodeCursor("not base64 at all !!")).toBeNull()
    expect(decodeCursor(Buffer.from("2026-10-12|x),or(true").toString("base64url"))).toBeNull()
    expect(decodeCursor(Buffer.from(`${c.createdAt}),id.gt.(0|${c.id}`).toString("base64url"))).toBeNull()
    expect(decodeCursor(["array"])).toBeNull()
  })
})
