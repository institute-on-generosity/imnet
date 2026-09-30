# imnet: Impact Network

An impact storytelling engine plus a shared network layer: "LinkedIn for nonprofits."

## The problem

Most donors give and then hear nothing. The loop between giving and gratitude never closes, so giving stays transactional. The impact knowledge already exists inside nonprofits, but there's no network for it to flow through.

**Flywheel:** giving → stories → emotion and trust → more giving.

## What it does

1. **Storytelling engine.** A nonprofit uploads materials it already has (program reports, outcome spreadsheets, case notes, photos). LLMs turn them into impact stories, each grounded in and cited back to those sources.
2. **Network layer.** Every story becomes a durable public artifact. Nonprofits get profiles built on real accomplishments. Donors follow orgs, receive stories, share them, and browse real impact instead of star ratings and overhead ratios.

## Users

- **Small nonprofits:** real outcomes, no comms team. The engine saves staff time.
- **Everyday donors:** want to see what their giving became and feel part of a community.

## Design principles (non-negotiable)

1. **No fabrication.** Every story is built from and traceably linked to real source materials. Donors can always see what a story is based on.
2. **Human approval.** AI drafts. Nonprofit staff review and approve every story before it's sent or published.
3. **Beneficiary dignity and privacy.** De-identified by default, consent required, stories of progress and agency rather than pity.
4. **Long-term meaning over short-term spikes.** No dark patterns, no engineered dopamine loops.

## V1 scope (pilot: 3–5 nonprofits)

- Nonprofit onboarding: upload source materials
- Automatic PII redaction on ingest
- Story generation: grounded LLM synthesis with citations to sources
- **Collective** and **public** stories (individual per-gift stories deferred)
- Review and approval workflow (single staff role per org)
- Email delivery to donors (donor list via CSV import)
- Public story page per nonprofit, with sharing
- Analytics: staff time saved, opens, replies, shares, donate-link clicks, repeat giving (via gift CSV matching)

## Stretch (after core works)

- Individual per-gift stories
- Generated images / short video
- Donor profiles and follows
- Cross-nonprofit discovery feed
- CRM integrations

## Stack

- **App:** Next.js (TypeScript), hosted on Vercel
- **Data:** Supabase (Postgres, auth, storage, pgvector)
- **LLM:** Claude (Anthropic API, citations)
- **Email:** Resend
- **Budget target:** free tiers, under $25/month during pilot

## Branches

- `main`: production, deployed
- `dev`: integration; feature branches merge here
