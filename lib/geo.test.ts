import { describe, expect, it } from "vitest"
import { formatMiles, milesBetween } from "./geo"

describe("F-101: distances for the Near you map", () => {
  it("measures great-circle miles", () => {
    const sf = { lat: 37.7749, lng: -122.4194 }, oakland = { lat: 37.8044, lng: -122.2712 }, nyc = { lat: 40.7128, lng: -74.006 }
    expect(milesBetween(sf, oakland)).toBeCloseTo(8.4, 0)
    expect(milesBetween(sf, nyc)).toBeGreaterThan(2550)
    expect(milesBetween(sf, nyc)).toBeLessThan(2590)
    expect(milesBetween(sf, sf)).toBe(0)
  })
  it("formats distances for people, not machines", () => {
    expect(formatMiles(0.05)).toBe("Here")
    expect(formatMiles(3.26)).toBe("3.3 mi")
    expect(formatMiles(2571.4)).toBe("2,571 mi")
  })
})
