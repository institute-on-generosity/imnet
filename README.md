# imnet: Impact Network

A LinkedIn for generosity. Nonprofits get rich profiles built on real impact. Donors discover causes through stories, not tax IDs and star ratings, and share what their giving became.

- **Vision and research:** [docs/vision/iteration-1.md](docs/vision/iteration-1.md)
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

## Getting started
1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. Configure env:
   ```sh
   cp .env.example .env.local   # fill in Supabase URL + publishable key, Anthropic key
   ```
3. Install and load the schema + demo data:
   ```sh
   npm install
   npx supabase login
   npm run db:link              # pick your project
   npm run db:push              # migrations + supabase/seed.sql
   ```
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/confirm` to redirect URLs.
5. Run:
   ```sh
   npm run dev
   ```
6. Make yourself admin (Supabase SQL editor, after signing in once):
   ```sql
   update profiles set is_admin = true where handle = 'your_handle';
   ```

## Scripts
| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `typecheck` / `test` | Checks (same as CI) |
| `npm run build` | Production build |
| `npm run db:push` | Apply migrations + seed to linked project |
| `npm run db:types` | Generate `lib/database.types.ts` |

## Branches
- `main`: production
- `dev`: integration. Feature branches → `dev` → `main`.
