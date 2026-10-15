@AGENTS.md

# imnet

LinkedIn for generosity. Phase I = the network. Phase II = AI media tools. See `CONTEXT.md` (domain terms), `docs/ARCHITECTURE.md` and `docs/decisions/`.

## Rules
- Design principles in README are non-negotiable: no fabrication, human approval, beneficiary dignity, no dark patterns.
- Access control lives in Postgres RLS (`supabase/migrations/`). New table → enable RLS + policies in the same migration, plus tests in `supabase/tests/rls.test.ts`.
- RLS tests that attempt forbidden actions use their own throwaway user/org, so a regression can't leak into other tests.
- No service-role/secret key in app code. Ops scripts in `scripts/` may use `SUPABASE_SECRET_KEY`.
- Mutations go in `app/actions.ts` as server actions; reads in `lib/queries.ts`. Exception: one-click signals (follow, support, moved) go through `app/api/signals` with keepalive.
- Feeds page with "Show older posts" (cursor in `lib/cursor.ts`). No infinite scroll.
- AI output is always a draft a human saves. AI never writes to the DB directly.
- Feeds stay chronological. No public engagement counts.
- Every feature or bug fix adds a dated entry to the Ledger in `CONTEXT.md` (next F-/B- ID, testable behavior, test file or `none`) in the same commit. Name regression tests after the ID.

## Commands
`npx supabase start` (needs Docker) · `npm run dev` (port 3100) · `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` (own Supabase stack on 553xx + build on :3200; `npm run e2e:stack -- stop` frees it) · `npm run build` · `npm run db:push`
