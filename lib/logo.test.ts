import { describe, expect, it } from "vitest"
import { logoPathIsValid, logoSrc } from "./logo"

const ORG = "00000000-0000-4000-a000-000000000001"
const good = `${ORG}/logo-0000000a-0000-4000-8000-000000000000.png`

describe("logos", () => {
  it("F-045: only fresh logo uploads in the org's own folder are accepted", () => {
    expect(logoPathIsValid(ORG, good)).toBe(true)
    expect(logoPathIsValid(ORG, `00000000-0000-4000-a000-000000000002/logo-0000000a-0000-4000-8000-000000000000.png`)).toBe(false)
    expect(logoPathIsValid(ORG, `${ORG}/0000000a-0000-4000-8000-000000000000.png`)).toBe(false)
    expect(logoPathIsValid(ORG, `${ORG}/logo-0000000a-0000-4000-8000-000000000000.svg`)).toBe(false)
    expect(logoPathIsValid(ORG, "https://tracker.example/pixel.png")).toBe(false)
  })

  it("B-019: logos render only from our storage; outside URLs render nothing", () => {
    expect(logoSrc(good, "http://127.0.0.1:54321")).toBe(`http://127.0.0.1:54321/storage/v1/object/public/post-images/${good}`)
    expect(logoSrc(`${ORG}/logo.png`, "http://s")).toBe(`http://s/storage/v1/object/public/post-images/${ORG}/logo.png`)
    expect(logoSrc("https://tracker.example/pixel.png", "http://s")).toBeNull()
    expect(logoSrc(`https://tracker.example/storage/v1/object/public/post-images/${good}`, "http://s")).toBeNull()
    expect(logoSrc("javascript:alert(1)", "http://s")).toBeNull()
    expect(logoSrc(null, "http://s")).toBeNull()
    expect(logoSrc("blob:http://localhost:3100/abc", "http://s")).toBe("blob:http://localhost:3100/abc")
  })
})
