import { describe, expect, it } from "vitest"
import { brandOf, charge, expiryValid, feeCents, formatCardNumber, formatExpiry, luhn } from "./test-gateway"

const now = new Date("2026-10-15T12:00:00Z")
const card = (number: string, exp = "12/28", cvc = "123") => ({ number, exp, cvc })

describe("F-099: test-mode payments", () => {
  it("accepts the success test card and returns only brand and last four", () => {
    const r = charge(card("4242 4242 4242 4242"), now)
    expect(r).toMatchObject({ ok: true, brand: "Visa", last4: "4242" })
    if (r.ok) expect(r.ref).toMatch(/^pi_test_[0-9a-f]{24}$/)
    expect(JSON.stringify(r)).not.toContain("4242424242424242")
  })
  it("declines the decline and insufficient-funds test cards", () => {
    expect(charge(card("4000000000000002"), now)).toMatchObject({ ok: false, error: /declined/ })
    expect(charge(card("4000000000009995"), now)).toMatchObject({ ok: false, error: /insufficient funds/ })
  })
  it("rejects bad numbers, past expiry and wrong CVC length with the field to fix", () => {
    expect(charge(card("4242 4242 4242 4241"), now)).toMatchObject({ ok: false, field: "number" })
    expect(charge(card("4242424242424242", "09/26"), now)).toMatchObject({ ok: false, field: "exp" })
    expect(charge(card("4242424242424242", "13/30"), now)).toMatchObject({ ok: false, field: "exp" })
    expect(charge(card("4242424242424242", "12/28", "12"), now)).toMatchObject({ ok: false, field: "cvc" })
    expect(charge(card("378282246310005", "12/28", "123"), now)).toMatchObject({ ok: false, field: "cvc" }) // Amex needs 4
  })
  it("treats the expiry month as valid until it ends", () => {
    expect(expiryValid("10/26", now)).toBe(true)
    expect(expiryValid("09/26", now)).toBe(false)
  })
  it("formats card numbers and expiry as you type", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242")
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005")
    expect(formatExpiry("1228")).toBe("12 / 28")
    expect(brandOf("5555555555554444")).toBe("Mastercard")
    expect(luhn("4242424242424242")).toBe(true)
  })
  it("covering the fee means the org receives the full gift", () => {
    const fee = feeCents(5000)
    expect(fee).toBe(143)
    // What the processor keeps from the total (2.2% + 30c) equals the fee.
    expect(Math.round((5000 + fee) * 0.022 + 30)).toBe(fee)
  })
})
