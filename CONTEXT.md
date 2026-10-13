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
- **Org**: a verified nonprofit with a public profile (`orgs`). Only `verified` orgs are public.
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
- **Supporter**: a follow the donor chose to show on their public profile (`follows.supporter`). Self-declared, not verified giving.
- **Moved**: a private "this moved me" on a post (`moved`). The org sees only a total. No public counts.
- **Share**: sending a post or profile link elsewhere. Logged as an event.
- **Report**: a donor flags a post for admin review (`reports`).
- **Event**: an analytics record: `view`, `share` or `donate_click` (`events`). Readable by the org's staff only.

## Giving
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
- `checked once` = verified by hand during the build (PGlite, Postgres in WebAssembly), but no test in the repo yet.

### Features

**2026-09-30**
- **F-001 Explore feed.** Shows published posts from verified orgs only, newest first. `?cause=x` shows only posts from orgs with that cause. Test: none
- **F-002 Following feed.** Shows posts only from orgs the user follows. Signed-out users are sent to `/login`. Test: none
- **F-003 Org profile.** `/o/[slug]` shows mission, causes, what gifts fund, impact stats, follower count and posts. Unknown or unverified slug → 404 for the public. Test: none
- **F-004 Impact stats need a source.** An impact stat without an http(s) `source_url` is rejected by the database. Test: none
- **F-005 Post page.** `/p/[id]` renders the post with share-preview metadata (title = org name, description = first 200 chars). Test: none
- **F-006 Donor profile.** `/u/[handle]` shows the user's causes and only the follows marked `supporter`. Test: none
- **F-007 Sign-up creates a profile.** A new auth user gets a `profiles` row with a generated handle matching `^[a-z0-9_]{3,30}$`. Test: checked once
- **F-008 Org claim.** A claim is rejected unless the EIN looks like `12-3456789`, the website is https, and the work email is on the website's domain. Test: none
- **F-009 Claim approval.** Only an admin can approve. Approval creates a verified org and makes the claimant staff. Test: checked once
- **F-010 Post composer.** Staff can post an update, impact story or ask, with an optional YouTube, Vimeo or Instagram link. Test: none
- **F-011 Images need consent.** A post with images and `beneficiary_consent = false` is rejected by the database. Test: checked once
- **F-012 Follow.** Users can follow and unfollow orgs. Other people's follows are hidden unless marked `supporter`. Test: checked once
- **F-013 Moved is private.** A user sees only their own "moved" marks. `moved_count()` returns a number only to that org's staff and admins, `null` to everyone else. Test: checked once
- **F-014 Events.** Anyone can log `view`, `share` or `donate_click`. Only the org's staff and admins can read them. A user can't log an event as another user. Test: checked once
- **F-015 Org dashboard.** `/dashboard/[orgId]` shows followers and 30-day views, shares and donate clicks. Non-staff get a 404. Test: none
- **F-016 AI profile draft.** "Draft from website" only fills the form; nothing is saved until staff click Save. Only that org's staff can run it. Websites must be https and public. Test: none
- **F-017 Admin queue.** `/admin` lists pending claims and open reports. Non-admins get a 404. Test: none
- **F-018 Post image uploads.** Staff can upload only into their own org's folder (`<org_id>/...`) in the `post-images` bucket. Test: checked once
- **F-019 Protected columns.** Users can't change `profiles.is_admin` or `orgs.status`. Test: checked once
- **F-020 Safe video embeds.** Only YouTube, Vimeo and Instagram links become embeds. Lookalike hosts (`youtube.com.evil.com`), other sites and non-http URLs are rejected. Test: `lib/embeds.test.ts`

### Fixes

**2026-09-30** (caught during the initial build)
- **B-001 Follower count was wrong.** Row-level security hid other people's follows, so counts showed only your own. Now `follower_count()` returns the true count for any visible org. Test: checked once
- **B-002 AI draft could be triggered by anyone.** Any signed-in user could run it for any org and spend Claude credits. Now non-staff get an error. Test: none
- **B-003 Staff could move a post to another org.** Updating `org_id` to an org they don't belong to is now rejected. Test: checked once
- **B-004 Build could crash without an Anthropic key.** The Claude client is now created on first use, so builds and pages work without `ANTHROPIC_API_KEY`. Test: CI build (implicit)
- **B-005 Pages carrying auth cookies could be cached.** The proxy now passes Supabase's no-cache headers. Test: none
- **B-006 AI cause suggestions weren't bounded.** Suggestions are now limited to 3 and to slugs in the `causes` table. Test: none
