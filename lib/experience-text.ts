// F-119 "volunteered 3 hrs at" / "gave $100 to": what an experience says, with the amount when shared.
type E = { kind: "volunteered" | "gave" | "attended"; hours: number | null; amount_usd: number | null }
const hrs = (h: number) => `${Number.isInteger(Number(h)) ? Number(h) : Number(h).toFixed(1)} ${Number(h) === 1 ? "hr" : "hrs"}`
export function experienceVerb(e: E) {
  if (e.kind === "volunteered") return e.hours ? `volunteered ${hrs(e.hours)} at` : "volunteered at"
  if (e.kind === "gave") return e.amount_usd ? `gave $${e.amount_usd.toLocaleString("en-US")} to` : "gave to"
  return "went to an event at"
}
