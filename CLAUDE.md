@AGENTS.md

# imnet

LinkedIn for generosity. Phase I = the network. Phase II = AI media tools. See `docs/ARCHITECTURE.md` and `docs/decisions/`.

## Rules
- Design principles in README are non-negotiable: no fabrication, human approval, beneficiary dignity, no dark patterns.
- Access control lives in Postgres RLS (`supabase/migrations/`). New table → enable RLS + policies in the same migration.
- No service-role key in app code.
- Mutations go in `app/actions.ts` as server actions; reads in `lib/queries.ts`.
- AI output is always a draft a human saves. AI never writes to the DB directly.
- Feeds stay chronological. No public engagement counts.

## Commands
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run db:push`
