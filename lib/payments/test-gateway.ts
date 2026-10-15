// F-099 Test-mode payments. A stand-in for a card processor with the same shape as a real one
// (create an intent, confirm it with a card), so a real processor can replace this module without
// touching the UI. No money moves and no card number is stored: only the brand and last four.
//
// Test cards (the industry's usual test numbers):
//   4242 4242 4242 4242  succeeds
//   4000 0000 0000 0002  declined
//   4000 0000 0000 9995  insufficient funds
// Any other valid number succeeds. Any future expiry and any 3-4 digit CVC.

export type CardInput = { number: string; exp: string; cvc: string; zip?: string }
export type Brand = "Visa" | "Mastercard" | "Amex" | "Discover" | "Card"
export type ChargeResult =
  | { ok: true; ref: string; brand: Brand; last4: string }
  | { ok: false; field?: "number" | "exp" | "cvc"; error: string }

export const TEST_CARD = "4242 4242 4242 4242"
export const MIN_USD = 1
export const MAX_USD = 100_000
export const PRESETS_USD = [25, 50, 100, 250] as const

const DECLINES: Record<string, string> = {
  "4000000000000002": "Your card was declined. Try another card.",
  "4000000000009995": "Your card has insufficient funds. Try another card.",
}

export const digits = (s: string) => s.replace(/\D/g, "")

export function luhn(num: string) {
  const d = digits(num)
  if (d.length < 12 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

export function brandOf(num: string): Brand {
  const d = digits(num)
  if (/^4/.test(d)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard"
  if (/^3[47]/.test(d)) return "Amex"
  if (/^6(011|5)/.test(d)) return "Discover"
  return "Card"
}

// "4242424242424242" -> "4242 4242 4242 4242" (Amex 4-6-5).
export function formatCardNumber(raw: string) {
  const d = digits(raw).slice(0, 19)
  const groups = brandOf(d) === "Amex" ? [4, 6, 5] : [4, 4, 4, 4, 3]
  const out: string[] = []
  let i = 0
  for (const g of groups) {
    if (i >= d.length) break
    out.push(d.slice(i, i + g))
    i += g
  }
  return out.join(" ")
}

// "1228" / "12/28" -> "12 / 28"
export function formatExpiry(raw: string) {
  const d = digits(raw).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
}

export function expiryValid(exp: string, now = new Date()) {
  const d = digits(exp)
  if (d.length !== 4) return false
  const month = Number(d.slice(0, 2))
  const year = 2000 + Number(d.slice(2))
  if (month < 1 || month > 12) return false
  // Valid through the end of the expiry month.
  return new Date(year, month, 1) > now
}

// Processing fee a donor can choose to cover: 2.2% + $0.30 (a typical nonprofit rate), grossed up so
// the org receives the full gift. In cents.
export function feeCents(amountCents: number) {
  return Math.round((amountCents + 30) / (1 - 0.022)) - amountCents
}

export function validateCard(card: CardInput, now = new Date()): ChargeResult | null {
  if (!luhn(card.number)) return { ok: false, field: "number", error: "That card number isn't valid." }
  if (!expiryValid(card.exp, now)) return { ok: false, field: "exp", error: "That expiry date has passed or isn't valid." }
  const cvcLen = brandOf(card.number) === "Amex" ? 4 : 3
  if (digits(card.cvc).length !== cvcLen) return { ok: false, field: "cvc", error: `Enter the ${cvcLen}-digit security code.` }
  return null
}

// Charge in test mode. Same inputs always give the same outcome.
export function charge(card: CardInput, now = new Date()): ChargeResult {
  const invalid = validateCard(card, now)
  if (invalid) return invalid
  const d = digits(card.number)
  if (DECLINES[d]) return { ok: false, error: DECLINES[d] }
  const ref = `pi_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`
  return { ok: true, ref, brand: brandOf(d), last4: d.slice(-4) }
}
