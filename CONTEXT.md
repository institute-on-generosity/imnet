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
