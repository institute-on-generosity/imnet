import { describe, expect, it } from "vitest"
import { logoPathIsValid, logoPublicUrl } from "./logo"

const ORG = "00000000-0000-4000-a000-000000000001"
const good = `${ORG}/logo-0000000a-0000-4000-8000-000000000000.png`

describe("logo paths", () => {
  it("F-045: only logo files in the org's own folder are accepted", () => {
    expect(logoPathIsValid(ORG, good)).toBe(true)
    expect(logoPathIsValid(ORG, `00000000-0000-4000-a000-000000000002/logo-0000000a-0000-4000-8000-000000000000.png`)).toBe(false)
    expect(logoPathIsValid(ORG, `${ORG}/0000000a-0000-4000-8000-000000000000.png`)).toBe(false)
    expect(logoPathIsValid(ORG, `${ORG}/logo-0000000a-0000-4000-8000-000000000000.svg`)).toBe(false)
    expect(logoPathIsValid(ORG, "https://tracker.example/pixel.png")).toBe(false)
    expect(logoPublicUrl("http://127.0.0.1:54321", good)).toBe(`http://127.0.0.1:54321/storage/v1/object/public/post-images/${good}`)
  })
})
