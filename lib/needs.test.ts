import { describe, expect, it } from "vitest"
import { parseNeedFields } from "./needs"

const ok = { kind: "item", title: "Winter coats, adult sizes", detail: "", helpUrl: "https://harbor.example.org/give" }

describe("F-051 need fields", () => {
  it("accepts a need with a link", () => {
    expect(parseNeedFields(ok)).toEqual({ fields: { kind: "item", title: "Winter coats, adult sizes", detail: null, help_url: "https://harbor.example.org/give" } })
  })
  it("turns a bare email into a mailto link", () => {
    expect(parseNeedFields({ ...ok, helpUrl: "help@harbor.org" })).toMatchObject({ fields: { help_url: "mailto:help@harbor.org" } })
  })
  it("rejects unknown kinds, short titles, long details and unsafe links", () => {
    expect(parseNeedFields({ ...ok, kind: "cash" })).toHaveProperty("error")
    expect(parseNeedFields({ ...ok, title: "ab" })).toHaveProperty("error")
    expect(parseNeedFields({ ...ok, detail: "x".repeat(501) })).toHaveProperty("error")
    expect(parseNeedFields({ ...ok, helpUrl: "javascript:alert(1)" })).toHaveProperty("error")
    expect(parseNeedFields({ ...ok, helpUrl: "" })).toHaveProperty("error")
  })
})
