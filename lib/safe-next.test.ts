import { describe, expect, it } from "vitest"
import { safeNext } from "./safe-next"

describe("safeNext", () => {
  it("B-015: keeps same-site paths", () => {
    expect(safeNext("/invite/abc")).toBe("/invite/abc")
    expect(safeNext("/o/harbor-table?tab=posts")).toBe("/o/harbor-table?tab=posts")
  })

  it("B-015: blocks open redirects to other sites", () => {
    expect(safeNext("//evil.com")).toBe("/")
    expect(safeNext("/\\evil.com")).toBe("/")
    expect(safeNext("https://evil.com")).toBe("/")
    expect(safeNext("javascript:alert(1)")).toBe("/")
    expect(safeNext("/%2F%2Fevil.com")).toBe("/%2F%2Fevil.com")
    expect(safeNext(null)).toBe("/")
    expect(safeNext(["/x"])).toBe("/")
  })

  it("B-017: blocks paths that only become '//host' after normalizing", () => {
    for (const raw of ["/.//evil.com", "/x/..//evil.com", "/%2e%2e//evil.com", "/./\\evil.com"]) expect(safeNext(raw)).toBe("/")
  })
})
