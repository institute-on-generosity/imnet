# Architecture

## Phases
- **Phase I: the network.** Verified nonprofit profiles, posts, feeds, follows, donor profiles, sharing, donate embed. Light AI assists.
- **Phase II: the tools.** AI storytelling engine (grounded, cited text) and video engine (real media assembled into video). Fills the network with content orgs couldn't afford to make.

## Stack
| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, TypeScript), npm |
| UI | Tailwind v4 + shadcn/ui |
| Data / auth / files | Supabase: Postgres, magic-link auth, Storage |
| Access control | Postgres Row Level Security (see migration) |
| AI | Claude via `@anthropic-ai/sdk`, structured outputs |
| Donations | Every.org (no money touches imnet) |
| Hosting | Vercel |
| CI | GitHub Actions: lint, typecheck, test, build |

Phase II adds: Inngest (jobs), Remotion + Remotion Lambda (video render), TTS, redaction pipeline, native video hosting.

## Layout
```
app/
  page.tsx                 Explore feed (chronological, cause filter)
  following/               Following feed
  o/[slug]/                Org profile
  p/[id]/                  Post page (share target)
  u/[handle]/              Donor profile
  login/, auth/confirm/    Magic-link sign-in
  dashboard/               Claim an org; list my orgs
  dashboard/[orgId]/       Composer, profile editor, stats, AI draft
  admin/                   Claims + reports queue
  actions.ts               All server actions (mutations)
components/                App components; components/ui = shadcn
lib/
  supabase/                server, browser, proxy clients
  queries.ts               Read queries
  embeds.ts                Video link -> safe iframe src (tested)
  ai/assists.ts            Human-approved AI suggestions
proxy.ts                   Session refresh (Next 16 "middleware")
supabase/
  migrations/              Schema + RLS
  seed.sql                 Synthetic demo data
  tests/                   RLS tests on a throwaway Postgres (PGlite)
```

## Data model
- `profiles` (1:1 with `auth.users`, created by trigger), `profile_causes`
- `orgs`, `org_members`, `org_causes`, `impact_stats` (source URL required)
- `org_claims` → `approve_claim()` creates org + membership (admin only)
- `posts` (kind: update / impact_story / ask; images require consent flag)
- `follows` (`supporter` flag = public "I support"), `moved` (private reaction)
- `reports`, `events` (view / share / donate_click)
- `causes` (fixed taxonomy)

## Security model
- RLS on every table. The app never uses a service-role key in Phase I.
- Column-level grants stop users editing `profiles.is_admin` or `orgs.status`.
- Aggregates that must stay private-by-row use `security definer` functions: `follower_count`, `moved_count`.
- Embeds: only YouTube (nocookie), Vimeo, Instagram iframe URLs are stored; sandboxed iframes.
- AI website fetch: https only, basic private-host block, 8s timeout, staff of that org only.

## Design principles in code
| Principle | Where |
|---|---|
| No fabrication | `impact_stats.source_url NOT NULL`; AI prompts grounded, outputs are drafts |
| Human approval | AI never writes to the DB; staff edit and save |
| Dignity / privacy | `images_need_consent` check; consent checkbox in composer |
| No dark patterns | Chronological feeds; `moved` has no public count |

## Environments
- Dev and prod: hosted Supabase projects (local Supabase needs Docker).
- Free tiers. Upgrade Supabase to Pro when pilots go live (free projects pause after 7 idle days).
