# Context

Domain language for imnet. Use these terms in code, docs and UI. Table names in `code`.

## People
- **Donor**: anyone with an account. Browses, follows, shares, marks posts that moved them. Row in `profiles`.
- **Beginner donor**: a donor still discovering causes. Same account type; a product audience, not a role.
- **Staff**: a donor who is a member of an org (`org_members`). Can post and edit that org's profile.
- **Admin**: imnet team (`profiles.is_admin`). Approves claims, handles reports.
- **Beneficiary**: a person an org serves. Never a user. Appears in posts only with consent.
- **Individual fundraiser**: a person raising money for themselves. Deferred past Phase I (decisions/0004).

## Nonprofits
- **Org**: a verified organization with a public profile (`orgs`). Only `verified` orgs are public.
- **Org type**: `nonprofit` (does the work) or `foundation` (funds the work, e.g. through grants). Set at claim time; only admins change it.
- **Claim**: a staff member's request to represent an org (`org_claims`). Needs an EIN, an https website and a work email on that domain. An admin approves it with `approve_claim()`, which creates the org and the membership.
- **Profile**: an org's public page (`/o/[slug]`): mission, causes, what gifts fund, impact stats, posts, donate.
- **Impact stat**: one number on a profile with a required source link (`impact_stats`). No source, no stat.
- **What gifts fund**: plain-language examples of what a donation pays for.
- **Cause**: a fixed category (`causes`), e.g. hunger, housing. Orgs pick causes; donors list causes they care about.

## Content
- **Post**: anything an org publishes (`posts`). Three kinds:
  - **Update**: news or progress.
  - **Impact story**: what giving made possible.
  - **Ask**: a specific need.
- **Embed**: a YouTube, Vimeo or Instagram video attached to a post. Only those providers are allowed (`lib/embeds.ts`).
- **Consent**: staff confirm anyone identifiable has agreed to be shown. Posts with images require it.
- **Feed**: a list of posts, newest first. Never ranked by engagement.
  - **Explore**: all orgs, filterable by cause.
  - **Following**: only orgs you follow.

## Network
- **Follow**: a donor subscribes to an org's posts (`follows`). Private.
- **Supporter**: a follow the donor chose to show on their public profile (`follows.supporter`). Self-declared, not verified giving. For a foundation, worded "I give through this fund".
- **Portfolio**: a foundation's grantees' grant reports. Following a foundation brings its portfolio into your Following feed, labeled "From the portfolio of <foundation>, which you follow".
- **What my giving became**: on a donor's profile, the confirmed grants (and latest reports) of each fund they say they give through. Pooled money: the fund's record, not a trace of one gift.
- **Moved**: a private "this moved me" on a post (`moved`). The org sees only a total. No public counts.
- **Share**: sending a post or profile link elsewhere. Logged as an event.
- **Report**: a donor flags a post for admin review (`reports`).
- **Event**: an analytics record: `view`, `share` or `donate_click` (`events`). Readable by the org's staff only.

## Giving
- **Grant**: money a foundation gives a nonprofit (`grants`). The foundation records it, optionally tagged on a post; the nonprofit **confirms** it. Only confirmed grants are public.
- **Grant report**: a nonprofit's post about what a confirmed grant made possible (`posts.reports_grant_id`). Shown with a banner on the post and as the latest report on the foundation's Grantees list.
- **Funded by / Grantees**: a nonprofit's confirmed grants by funder / a foundation's confirmed grants by recipient. Totals are computed from grants, never typed in.
- **Donate**: handled by Every.org (`orgs.everyorg_slug`). imnet never touches money.

## AI
- **Assist**: an AI suggestion staff can edit before saving, e.g. drafting a profile from the org's website. Never writes to the database itself.
- **Grounded**: generated text uses only facts from the source material. No invented numbers, names or outcomes.
- **Story engine** (Phase II): turns an org's real materials into cited text stories.
- **Video engine** (Phase II): assembles an org's real photos and clips into video. Never generates people or scenes.

## Phases
- **Phase I: the network.** Profiles, posts, feeds, follows, sharing.
- **Phase II: the tools.** Story and video engines that fill the network.

## Ledger

Every shipped feature and fixed bug, with the date and the behavior that must keep working. Each entry should become a regression test named after its ID (e.g. `it("F-004: ...")`).

**Rules**
- Add an entry in the same commit as the feature or fix. Never edit an old entry's behavior; add a new one that supersedes it.
- **Behavior** is a testable statement: given X, expect Y.
- **Test** is the test file, or `none`. Entries marked `none` are the test backlog.
- Database rules are tested in `supabase/tests/` against a throwaway Postgres (PGlite), no Supabase project needed.
- Pages and flows are tested in `e2e/` with Playwright against local Supabase (`npm run test:e2e`; CI runs both).

### Features

**2026-09-30**
- **F-001 Explore feed.** Shows published posts from verified orgs only, newest first. `?cause=x` shows only posts from orgs with that cause. Test: `e2e/public.spec.ts`, `supabase/tests/rls.test.ts`
- **F-002 Following feed.** Shows posts only from orgs the user follows. Signed-out users are sent to `/login`. Test: `e2e/public.spec.ts`, `e2e/signed-in.spec.ts`
- **F-003 Org profile.** `/o/[slug]` shows mission, causes, what gifts fund, impact stats, follower count and posts. Unknown or unverified slug → 404 for the public. Test: `e2e/public.spec.ts`, `supabase/tests/rls.test.ts`
- **F-004 Impact stats need a source.** An impact stat without an http(s) `source_url` is rejected by the database. Test: `supabase/tests/rls.test.ts`
- **F-005 Post page.** `/p/[id]` renders the post with share-preview metadata (title = org name, description = first 200 chars). Test: none
- **F-006 Donor profile.** `/u/[handle]` shows the user's causes and only the follows marked `supporter`. Test: none
- **F-007 Sign-up creates a profile.** A new auth user gets a `profiles` row with a generated handle matching `^[a-z0-9_]{3,30}$`. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-008 Org claim.** A claim is rejected unless the EIN looks like `12-3456789`, the website is https, and the work email is on the website's domain. Test: `e2e/signed-in.spec.ts`
- **F-009 Claim approval.** Only an admin can approve. Approval creates a verified org and makes the claimant staff. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-010 Post composer.** Staff can post an update, impact story or ask, with an optional YouTube, Vimeo or Instagram link. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-011 Images need consent.** A post with images and `beneficiary_consent = false` is rejected by the database. Test: `supabase/tests/rls.test.ts`
- **F-012 Follow.** Users can follow and unfollow orgs. Other people's follows are hidden unless marked `supporter`. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-013 Moved is private.** A user sees only their own "moved" marks. `moved_count()` returns a number only to that org's staff and admins, `null` to everyone else. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-014 Events.** Anyone can log `view`, `share` or `donate_click`. Only the org's staff and admins can read them. A user can't log an event as another user. Test: `e2e/signed-in.spec.ts`, `supabase/tests/rls.test.ts`
- **F-015 Org dashboard.** `/dashboard/[orgId]` shows followers and 30-day views, shares and donate clicks. Non-staff get a 404. Test: `e2e/signed-in.spec.ts`
- **F-016 AI profile draft.** "Draft from website" only fills the form; nothing is saved until staff click Save. Only that org's staff can run it. Websites must be https and public. Test: none
- **F-017 Admin queue.** `/admin` lists pending claims and open reports. Non-admins get a 404. Test: `e2e/signed-in.spec.ts` (approve flow)
- **F-018 Post image uploads.** Staff can upload only into their own org's folder (`<org_id>/...`) in the `post-images` bucket. Test: `supabase/tests/rls.test.ts`
- **F-019 Protected columns.** Users can't change `profiles.is_admin` or `orgs.status`. Test: `supabase/tests/rls.test.ts`
- **F-020 Safe video embeds.** Only YouTube, Vimeo and Instagram links become embeds. Lookalike hosts (`youtube.com.evil.com`), other sites and non-http URLs are rejected. Test: `lib/embeds.test.ts`

**2026-10-13**
- **F-021 Footnoted impact stats.** On an org profile, each distinct source is numbered once in order of first use, every figure shows its footnote number, and the footnote links to the source with its "as of" date. Test: `lib/footnotes.test.ts`, `e2e/public.spec.ts`
- **F-022 Visual identity.** Literata for stories and headlines, Schibsted Grotesk for interface text, ink/leaf/marigold palette, pill buttons. Posts on an org's own profile hide the repeated org name. Test: none (visual)
- **F-023 LinkedIn-style home.** Three columns on desktop: your profile card (or a Join card when signed out), the feed, and "Nonprofits to follow". Suggestions are verified orgs you don't follow, alphabetical, never popularity-ranked. Phones show the feed only. Test: none
- **F-024 Org page tabs.** Cover banner, overlapping logo, Follow (primary), Donate and Share, then Home, About and Posts tabs. `?tab=` accepts only those three; anything else shows Home. "Similar nonprofits" sidebar shares the org's first cause. Test: `lib/org-tabs.test.ts`, `e2e/public.spec.ts`
- **F-025 Search nonprofits.** Header search finds verified orgs by name, up to 20, alphabetical. `%` and `_` in a search match literally. Test: `lib/search.test.ts`, `e2e/public.spec.ts`
- **F-026 Post action bar.** Every post card has "Moved me" (private, signed-out users go to sign-in), Share and Open. Long posts clamp to 4 lines with "see more". Supersedes F-022's hidden org name on profiles: posts always show their org. Test: none
- **F-027 Photo posts.** A post can carry up to 4 photos, shown LinkedIn-style (1 full width, 2 side by side, 3 as one large plus two, 4 as a grid). Every photo has alt text; credits, when present, show under the photos. The database rejects a 5th photo, missing or empty alt text, and credits that don't match the photos. Test: `supabase/tests/rls.test.ts`, `e2e/public.spec.ts`
- **F-028 Photo upload in the composer.** Staff add photos (JPG, PNG, WebP, under 5 MB), which upload to their org's folder right away. Each needs a description, and photos need the consent box. The server re-checks every path is in that org's folder. Test: `lib/post-images.test.ts`, `e2e/signed-in.spec.ts`
- **F-029 Demo media.** Seed orgs have 11 openly licensed photos (and, since F-032, 3 videos) from Wikimedia Commons showing volunteers at work (pantry restocking, packing grocery boxes, sorting a food drive, roof repair, school setup), never the people being served. Credits in `supabase/seed-images/CREDITS.md` and on each post. Loaded by `npx supabase seed buckets --local`. Test: none
- **F-030 Shared videos.** Wikimedia Commons video links (`.webm`, `.ogv`) embed through Commons' own player, alongside YouTube, Vimeo and Instagram. A video can carry a credit line ("Video: ..."); the database rejects a credit without a video. Test: `lib/embeds.test.ts`, `supabase/tests/rls.test.ts`
- **F-031 Upload cleanup.** Removing a photo in the composer deletes it from storage at once. `npm run cleanup:uploads` deletes photos older than a day that no post uses (via `orphan_post_images()`, callable only by the service role; the script uses `SUPABASE_SECRET_KEY`, never the web app). Test: `supabase/tests/rls.test.ts` (listing and permissions)
- **F-032 Video posts that autoplay.** Posts can carry a native video (file in the `post-videos` bucket, with a poster, a required description and an optional credit). In the feed, videos play muted while 60% on screen and pause when scrolled away; YouTube and Vimeo links start muted when scrolled into view. No autoplay when the device asks to reduce motion. A post has at most one video (native or embedded). Demo: Harbor Table's pantry garden harvest and a new demo org, Greenway Stewards (environment), with trail and fence-removal crews; openly licensed footage with no real org named, credited. Test: `supabase/tests/rls.test.ts`, `lib/autoplay-src.test.ts`, `e2e/public.spec.ts`
- **F-033 Nonprofits vs. foundations.** Every org is a nonprofit or a foundation, chosen on the claim form and carried to the approved org (staff can't change it). They look different everywhere: nonprofits get a green mark, banner and "Nonprofit" badge; foundations a navy mark with a marigold letter, a navy banner and a "Foundation" badge. Explore and Following filter by All / Nonprofits / Foundations, kept alongside the cause filter. Demo: Lakeshore Community Foundation posts its grants to the demo nonprofits. Test: `supabase/tests/rls.test.ts`, `lib/feed-href.test.ts`, `e2e/public.spec.ts`
- **F-034 Grants link foundations to nonprofits.** A foundation's staff can tag up to 10 nonprofits on a post, each with an optional whole-dollar amount and purpose. Each grant stays private (visible only to both orgs' staff) until the nonprofit's staff confirm it from their dashboard ("Grants to confirm": Confirm or Not ours). Confirmed grants show on the post as links to the grantee. Only foundations give, only nonprofits receive; the funder can never confirm its own grant; changing a confirmed grant's amount, purpose or grantee un-confirms it. Test: `supabase/tests/rls.test.ts`, `lib/grants.test.ts`, `e2e/signed-in.spec.ts`, `e2e/public.spec.ts`
- **F-035 Funded by / Grantees.** Nonprofit profiles list confirmed grants by foundation ("Funded by"); foundation profiles list confirmed grantees with a computed total ("$43,000 to 2 nonprofits, each confirmed by the grantee"). Test: `lib/grants.test.ts`, `e2e/public.spec.ts`
- **F-036 Grant reports.** A nonprofit can mark a post as its report on a confirmed grant it received (composer: "This post reports on a grant"). The post shows a "Grant report for <foundation>" banner linking to the foundation; the foundation's Grantees list shows each grantee's latest report; the announcement post marks grants with "Report posted". The nonprofit's dashboard lists confirmed grants without a report ("Share how your grants are going") with a one-click "Write a report". The database only accepts reports on confirmed grants the posting org received. Test: `supabase/tests/rls.test.ts`, `e2e/public.spec.ts`, `e2e/signed-in.spec.ts`
- **F-037 Foundation portfolio.** Foundations have a Portfolio tab: grant reports from the nonprofits they fund. Following a foundation adds its portfolio to your Following feed; posts you see only because of that carry a "From the portfolio of <foundation>, which you follow" line. Nonprofits have no Portfolio tab (`?tab=portfolio` shows Home). Test: `lib/portfolio.test.ts`, `lib/org-tabs.test.ts`, `e2e/public.spec.ts`, `e2e/signed-in.spec.ts`
- **F-038 What my giving became.** On an org you follow, a toggle shows it on your public profile ("I give through this fund" for foundations, "I support this nonprofit" otherwise; self-reported). A donor's profile then lists, per fund, its confirmed grants and each grantee's latest report, with a note that funds are pooled. Visitors see it in the third person. Demo donor: `/u/dana_demo`. Test: `e2e/signed-in.spec.ts`

### Fixes

**2026-09-30** (caught during the initial build)
- **B-001 Follower count was wrong.** Row-level security hid other people's follows, so counts showed only your own. Now `follower_count()` returns the true count for any visible org. Test: `supabase/tests/rls.test.ts`
- **B-002 AI draft could be triggered by anyone.** Any signed-in user could run it for any org and spend Claude credits. Now non-staff get an error. Test: none
- **B-003 Staff could move a post to another org.** Updating `org_id` to an org they don't belong to is now rejected. Test: `supabase/tests/rls.test.ts`
- **B-004 Build could crash without an Anthropic key.** The Claude client is now created on first use, so builds and pages work without `ANTHROPIC_API_KEY`. Test: CI build (implicit)
- **B-005 Pages carrying auth cookies could be cached.** The proxy now passes Supabase's no-cache headers. Test: none
- **B-006 AI cause suggestions weren't bounded.** Suggestions are now limited to 3 and to slugs in the `causes` table. Test: none

**2026-10-13**
- **B-007 Outline buttons lost their border outside `<Button>`.** Links styled with `buttonVariants({ variant: "outline" })` kept `border-transparent`. Variant classes are now merged, so the outline shows. Test: `components/ui/button.test.ts`
- **B-008 Forms lost what you typed after an error.** React 19 resets a form after every action, so a claim rejected for its email came back empty. Server actions now return the submitted values with the error, and the login, claim, composer and profile forms refill from them. Test: `lib/form-values.test.ts`, `e2e/signed-in.spec.ts`
- **B-009 Org tab labels were lowercase for screen readers.** Tabs showed "Home / About / Posts" only through CSS capitalization; the text was "home / about / posts". Labels are now real text. Test: `e2e/public.spec.ts`
- **B-010 Feed jumped as photos loaded.** Lazy-loaded single photos had no reserved height, so posts shifted as images arrived (and photos below the fold had zero height). Single photos now sit in a fixed 4:3 frame like galleries. Test: `e2e/public.spec.ts`
- **B-011 Single portrait photos overflowed their frame.** The 4:3 frame from B-010 held galleries but a single tall photo grew past it. The frame now clips and the photo fills it. Test: none (visual)

- **B-012 Dashboard card titles weren't headings.** shadcn's `CardTitle` renders a `<div>`, so screen-reader users couldn't jump between dashboard and admin sections. It now renders an `<h2>`. Test: `e2e/signed-in.spec.ts`
