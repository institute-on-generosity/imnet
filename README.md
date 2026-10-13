# imnet: Impact Network

A LinkedIn for generosity. Nonprofits get rich profiles built on real impact. Donors discover causes through stories, not tax IDs and star ratings, and share what their giving became.

- **Vision and research:** [docs/vision/iteration-1.md](docs/vision/iteration-1.md)
- **Domain terms:** [CONTEXT.md](CONTEXT.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Decisions:** [docs/decisions/](docs/decisions/)

## Phases
- **Phase I: the network** (now). Verified nonprofit profiles, posts with video embeds, Explore and Following feeds, donor accounts and profiles, sharing, Every.org donate. Light AI assists.
- **Phase II: the tools.** AI storytelling engine (text grounded in and cited to the org's own materials) and video engine (real photos and clips assembled into agency-quality video).

## Design principles (non-negotiable)
1. **No fabrication.** Every impact claim links to a real source.
2. **Human approval.** AI drafts. Staff review everything before it's public.
3. **Beneficiary dignity and privacy.** Consent required. Progress and agency, not pity.
4. **Long-term meaning over short-term spikes.** No dark patterns, no engineered dopamine loops.

## Stack
Next.js 16 · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, auth, storage, RLS) · Claude · Every.org · Vercel

## Getting started (local)
Everything runs on your machine: Postgres, auth, storage and a mail inbox for sign-in links.

1. Install and open [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Start local Supabase (first run downloads images; applies `supabase/migrations` and `supabase/seed.sql`):
   ```sh
   npm install
   npx supabase start
   npx supabase seed buckets --local   # demo photos
   ```
3. Create `.env.local` from `.env.example`. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `npx supabase status`. `ANTHROPIC_API_KEY` is optional (only "Draft from website" needs it).
4. Run the app at **http://localhost:3100** (port 3100 so it doesn't clash with other projects on 3000):
   ```sh
   npm run dev
   ```
5. Sign in: enter any email, then open the link from the local inbox at **http://127.0.0.1:54324**.
6. Make yourself admin (to approve org claims): open Studio at **http://127.0.0.1:54323** → SQL editor:
   ```sql
   update profiles set is_admin = true where handle = 'your_handle';
   ```

| Local service | URL |
|---|---|
| App | http://localhost:3100 |
| Mail inbox (sign-in links) | http://127.0.0.1:54324 |
| Studio (database UI) | http://127.0.0.1:54323 |
| API | http://127.0.0.1:54321 |

Reset the local database to the demo data: `npx supabase db reset && npx supabase seed buckets --local`. Stop everything: `npx supabase stop`.

## Scripts
| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `typecheck` / `test` | Checks (same as CI) |
| `npm run test:e2e` | Browser tests (Playwright) against local Supabase; starts the dev server if needed |
| `npm run cleanup:uploads` | Delete photos uploaded but never posted (`-- --dry-run` to list). Needs `SUPABASE_SECRET_KEY` |
| `npm run build` | Production build |
| `npm run db:push` | Apply migrations + seed to a linked hosted project (later) |
| `npm run db:types` | Generate `lib/database.types.ts` |

## Branches
- `main`: production
- `dev`: integration. Feature branches → `dev` → `main`.
