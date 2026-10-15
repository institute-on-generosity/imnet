import { describe, expect, it } from "vitest"
import { validateImages } from "./post-images"

const ORG = "00000000-0000-4000-a000-000000000001"
const img = (n = 1) => `${ORG}/0000000${n}-0000-4000-8000-000000000000.jpg`

describe("validateImages", () => {
  it("F-028: accepts up to 4 photos in the org's folder, each with a description", () => {
    expect(validateImages(ORG, [img(1), img(2)], [" Keys ", "Boxes"])).toEqual({ paths: [img(1), img(2)], alts: ["Keys", "Boxes"] })
    expect(validateImages(ORG, [], [])).toEqual({ paths: [], alts: [] })
  })

  it("F-028: rejects a fifth photo, missing descriptions, and paths outside the org's folder", () => {
    expect(validateImages(ORG, [1, 2, 3, 4, 5].map(img), ["a", "b", "c", "d", "e"])).toHaveProperty("error")
    expect(validateImages(ORG, [img()], ["  "])).toHaveProperty("error")
    expect(validateImages(ORG, [img()], [])).toHaveProperty("error")
    expect(validateImages(ORG, [`00000000-0000-4000-a000-000000000002/0000000a-0000-4000-8000-000000000000.jpg`], ["x"])).toHaveProperty("error")
    expect(validateImages(ORG, [`${ORG}/../secret.jpg`], ["x"])).toHaveProperty("error")
    expect(validateImages(ORG, [`${ORG}/0000000a-0000-4000-8000-000000000000.svg`], ["x"])).toHaveProperty("error")
  })
})

describe("F-080 donor photos", () => {
  it("accepts only uploads in the person's own folder", () => {
    const me = "10000000-0000-4000-8000-000000000001"
    const p = `people/${me}/11111111-2222-4333-8444-555555555555.webp`
    expect(validateImages(`people/${me}`, [p], ["A volunteer shift"])).toEqual({ paths: [p], alts: ["A volunteer shift"] })
    expect(validateImages(`people/${me}`, [p.replace(me, "10000000-0000-4000-8000-000000000002")], ["x"])).toHaveProperty("error")
  })
})
