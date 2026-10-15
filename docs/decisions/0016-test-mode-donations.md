# 0016 Donations run through a test-mode processor
**Status:** accepted, 2026-10-15.

Donors give to any visible nonprofit or foundation from its profile, its donation calls and the Calls to help card, without leaving imnet (F-099). Payments go through `lib/payments/test-gateway.ts`, a stand-in with a processor's shape (charge a card, get a reference) and the industry's usual test cards. No money moves; the UI says "Test mode" at every step.

**Why:** the owner asked for an easy, Stripe-like way to give, and the demo orgs are fictional, so a real processor (or invented Every.org links) would be fabrication. Keeping the processor behind one module lets a real one replace it later.
**Rules:** only successful charges are recorded; only card brand and last four are stored (DB checks enforce it); `provider = 'test'` and `pi_test_` references only; donors see their own gifts; staff see gifts to their org through `org_donations()`, which hides anonymous donors' names; each gift is also logged in the private giving journal. One-time is the default, covering fees and monthly are opt-in, and the total is on the button (no dark patterns).
**With a real processor:** card entry moves to the processor's hosted fields so card data never reaches imnet's server, webhooks confirm charges, and monthly gifts become real subscriptions (today "monthly" is recorded but nothing recurs).
**Replaces:** the Every.org link-out button (none of the demo orgs had a slug).
