import { describe, expect, it } from "vitest"
import { orgCoverPathIsValid, orgCoverSrc, personCoverPath, personCoverSrc } from "./cover"
import { parseFoundedYear, parsePrograms } from "./profile-fields"

const ORG = "00000000-0000-4000-a000-000000000001"
const U = "11111111-2222-4333-8444-555555555555"

describe("F-073 covers", () => {
  it("org covers: only the org's own folder; URLs built from the path", () => {
    expect(orgCoverPathIsValid(ORG, `${ORG}/cover-${U}.webp`)).toBe(true)
    expect(orgCoverPathIsValid(ORG, `00000000-0000-4000-a000-000000000002/cover-${U}.webp`)).toBe(false)
    expect(orgCoverSrc(`${ORG}/cover.webp`, "http://x")).toBe(`http://x/storage/v1/object/public/post-images/${ORG}/cover.webp`)
    expect(orgCoverSrc("https://evil.example/a.jpg")).toBeNull()
  })
  it("people's covers: only the shared set", () => {
    expect(personCoverPath("lavender")).toBe("covers/lavender.webp")
    expect(personCoverPath("../../secret")).toBeNull()
    expect(personCoverSrc("covers/lavender.webp", "http://x")).toBe("http://x/storage/v1/object/public/post-images/covers/lavender.webp")
    expect(personCoverSrc("https://evil.example/a.jpg")).toBeNull()
  })
})

describe("F-073 profile fields", () => {
  it("programs: comma or line separated, at most 8, each under 60 characters", () => {
    expect(parsePrograms(" Dinners, Pantry\nGarden ,")).toEqual({ programs: ["Dinners", "Pantry", "Garden"] })
    expect(parsePrograms(Array(9).fill("x").join(","))).toHaveProperty("error")
    expect(parsePrograms("y".repeat(61))).toHaveProperty("error")
  })
  it("founded year: empty or 1800 to this year", () => {
    expect(parseFoundedYear("", 2026)).toEqual({ year: null })
    expect(parseFoundedYear("2009", 2026)).toEqual({ year: 2009 })
    expect(parseFoundedYear("2027", 2026)).toHaveProperty("error")
    expect(parseFoundedYear("abc", 2026)).toHaveProperty("error")
  })
})
