// Database security rules (RLS, grants, checks). Each test is named after its CONTEXT.md Ledger entry.

import { beforeAll, describe, expect, it } from "vitest"
import { ADMIN, createTestDb, DONOR, ORG_1, ORG_2, ORG_PENDING, STAFF } from "./harness"

let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
}, 60_000)

const n = (rows: Record<string, unknown>[] | undefined) => Number(rows?.[0]?.n)

describe("feeds and profiles", () => {
  it("F-001: public sees only published posts of verified orgs", async () => {
    await t.owner(`insert into posts (org_id, body, published) values ('${ORG_1}', 'draft', false)`)
    await t.owner(`insert into posts (org_id, body) values ('${ORG_PENDING}', 'from pending org')`)

    const visible = await t.as(null, `select body from posts`)
    const bodies = visible.rows!.map((r) => r.body)
    expect(bodies).not.toContain("draft")
    expect(bodies).not.toContain("from pending org")
    expect(bodies.length).toBeGreaterThan(0)
  })

  it("F-003: unverified orgs are hidden from the public and donors", async () => {
    expect((await t.as(null, `select id from orgs where id = '${ORG_PENDING}'`)).rows).toHaveLength(0)
    expect((await t.as(DONOR, `select id from orgs where id = '${ORG_PENDING}'`)).rows).toHaveLength(0)
    expect((await t.as(ADMIN, `select id from orgs where id = '${ORG_PENDING}'`)).rows).toHaveLength(1)
  })

  it("F-004: impact stats need an http(s) source", async () => {
    const bad = await t.as(STAFF, `insert into impact_stats (org_id, label, value, source_url) values ('${ORG_1}', 'Meals', '10', 'not-a-url')`)
    expect(bad.error).toMatch(/check constraint/)

    const good = await t.as(STAFF, `insert into impact_stats (org_id, label, value, source_url) values ('${ORG_1}', 'Meals', '10', 'https://example.org/report')`)
    expect(good.error).toBeUndefined()
  })

  it("F-007: sign-up creates a profile with a valid handle", async () => {
    const id = "10000000-0000-4000-8000-0000000000aa"
    await t.owner(`insert into auth.users (id, email) values ('${id}', 'New.Person+tag@example.com')`)
    const [profile] = await t.owner(`select handle from profiles where id = '${id}'`)
    expect(profile.handle).toMatch(/^[a-z0-9_]{3,30}$/)
  })
})

describe("orgs and claims", () => {
  it("F-009: only an admin can approve a claim; approval creates a verified org and staff membership", async () => {
    const claim = await t.as(
      DONOR,
      `insert into org_claims (user_id, org_name, ein, website, work_email)
       values ('${DONOR}', 'Claimed Org', '12-3456789', 'https://claimed.example.org', 'dana@claimed.example.org') returning id`,
    )
    // insert ... returning needs read access; the claimant can read their own claim
    const claimId = claim.rows![0].id

    expect((await t.as(DONOR, `select approve_claim('${claimId}', 'claimed-org')`)).error).toMatch(/admin only/)
    expect((await t.as(STAFF, `select approve_claim('${claimId}', 'claimed-org')`)).error).toMatch(/admin only/)

    const approved = await t.as(ADMIN, `select approve_claim('${claimId}', 'claimed-org') as org_id`)
    const orgId = approved.rows![0].org_id

    const [org] = await t.owner(`select status from orgs where id = '${orgId}'`)
    expect(org.status).toBe("verified")
    expect(await t.owner(`select 1 from org_members where org_id = '${orgId}' and user_id = '${DONOR}'`)).toHaveLength(1)
  })

  it("F-019: users can't make themselves admin or change an org's status", async () => {
    // Throwaway user and org, so a regression here can't leak admin rights into other tests.
    const user = "10000000-0000-4000-8000-0000000000f1"
    const org = "00000000-0000-4000-a000-0000000000f1"
    await t.owner(`insert into auth.users (id, email) values ('${user}', 'mallory@escalate.example.org')`)
    await t.owner(`insert into orgs (id, slug, name, status) values ('${org}', 'escalate-org', 'Escalate Org', 'verified')`)
    await t.owner(`insert into org_members (org_id, user_id) values ('${org}', '${user}')`)

    expect((await t.as(user, `update profiles set is_admin = true where id = '${user}'`)).error).toMatch(/permission denied/)
    expect((await t.as(user, `update orgs set status = 'suspended' where id = '${org}'`)).error).toMatch(/permission denied/)

    // Allowed columns still work
    expect((await t.as(user, `update profiles set bio = 'hi' where id = '${user}'`)).error).toBeUndefined()
    expect((await t.as(user, `update orgs set mission = 'Meals with dignity' where id = '${org}'`)).error).toBeUndefined()
  })
})

describe("posts", () => {
  it("F-010: only an org's staff can post for it", async () => {
    const insert = (who: string | null) =>
      t.as(who, `insert into posts (org_id, author_id, body) values ('${ORG_1}', ${who ? `'${who}'` : "null"}, 'hello')`)

    expect((await insert(null)).error).toMatch(/row-level security/)
    expect((await insert(DONOR)).error).toMatch(/row-level security/)
    expect((await insert(STAFF)).error).toBeUndefined()

    // Staff of ORG_1 can't post for ORG_2
    const other = await t.as(STAFF, `insert into posts (org_id, author_id, body) values ('${ORG_2}', '${STAFF}', 'x')`)
    expect(other.error).toMatch(/row-level security/)
  })

  it("F-011: posts with images need beneficiary consent", async () => {
    const noConsent = await t.as(STAFF, `insert into posts (org_id, author_id, body, image_paths, image_alts) values ('${ORG_1}', '${STAFF}', 'x', '{a.jpg}', '{photo}')`)
    expect(noConsent.error).toMatch(/images_need_consent/)

    const consent = await t.as(
      STAFF,
      `insert into posts (org_id, author_id, body, image_paths, image_alts, beneficiary_consent) values ('${ORG_1}', '${STAFF}', 'x', '{a.jpg}', '{photo}', true)`,
    )
    expect(consent.error).toBeUndefined()
  })

  it("F-027: every photo needs alt text; at most 4 photos; credits match photos", async () => {
    const post = (paths: string, alts: string, credits = "'{}'") =>
      t.as(STAFF, `insert into posts (org_id, author_id, body, image_paths, image_alts, image_credits, beneficiary_consent)
                   values ('${ORG_1}', '${STAFF}', 'photos', ${paths}, ${alts}, ${credits}, true)`)

    expect((await post(`'{a.jpg}'`, `'{}'`)).error).toMatch(/images_have_alts/)
    expect((await post(`'{a.jpg}'`, `'{""}'`)).error).toMatch(/images_have_alts/)
    expect((await post(`'{a,b,c,d,e}'`, `'{1,2,3,4,5}'`)).error).toMatch(/images_max_four/)
    expect((await post(`'{a.jpg,b.jpg}'`, `'{x,y}'`, `'{only-one}'`)).error).toMatch(/images_credit_each/)
    expect((await post(`'{a.jpg,b.jpg}'`, `'{Keys,Boxes}'`)).error).toBeUndefined()
  })

  it("F-030: a video credit needs a video", async () => {
    const noVideo = await t.as(STAFF, `insert into posts (org_id, author_id, body, embed_credit) values ('${ORG_1}', '${STAFF}', 'x', 'Someone, CC BY')`)
    expect(noVideo.error).toMatch(/embed_credit_needs_embed/)
    const ok = await t.as(
      STAFF,
      `insert into posts (org_id, author_id, body, embed_url, embed_credit) values ('${ORG_1}', '${STAFF}', 'x', 'https://player.vimeo.com/video/1', 'Someone, CC BY')`,
    )
    expect(ok.error).toBeUndefined()
  })

  it("B-003: staff can't move a post to another org", async () => {
    const [post] = await t.owner(`insert into posts (org_id, author_id, body) values ('${ORG_1}', '${STAFF}', 'stay here') returning id`)
    const moved = await t.as(STAFF, `update posts set org_id = '${ORG_2}' where id = '${post.id}'`)
    expect(moved.error).toMatch(/row-level security/)
  })
})

describe("network", () => {
  it("F-012: follows are private unless marked supporter", async () => {
    expect((await t.as(DONOR, `insert into follows (user_id, org_id) values ('${DONOR}', '${ORG_1}')`)).error).toBeUndefined()
    expect((await t.as(DONOR, `insert into follows (user_id, org_id, supporter) values ('${DONOR}', '${ORG_2}', true)`)).error).toBeUndefined()

    // The donor sees both of their own follows
    expect(n((await t.as(DONOR, `select count(*)::int n from follows where user_id = '${DONOR}'`)).rows)).toBe(2)
    // Others see only the supporter one
    const seen = await t.as(STAFF, `select org_id from follows where user_id = '${DONOR}'`)
    expect(seen.rows!.map((r) => r.org_id)).toEqual([ORG_2])

    // Nobody can follow on someone else's behalf
    expect((await t.as(STAFF, `insert into follows (user_id, org_id) values ('${DONOR}', '${ORG_PENDING}')`)).error).toMatch(/row-level security/)
  })

  it("B-001: follower_count shows the true count to everyone", async () => {
    await t.owner(`insert into follows (user_id, org_id) values ('${STAFF}', '${ORG_2}') on conflict do nothing`)
    const [{ n: truth }] = await t.owner(`select count(*)::int n from follows where org_id = '${ORG_2}'`)

    expect(n((await t.as(null, `select follower_count('${ORG_2}')::int n`)).rows)).toBe(truth)
    expect(n((await t.as(DONOR, `select follower_count('${ORG_2}')::int n`)).rows)).toBe(truth)
    // Hidden orgs return null
    expect((await t.as(null, `select follower_count('${ORG_PENDING}') n`)).rows![0].n).toBeNull()
  })

  it("F-013: 'moved' is private; only the org's staff see a total", async () => {
    const [post] = await t.owner(`insert into posts (org_id, body) values ('${ORG_1}', 'moving story') returning id`)
    expect((await t.as(DONOR, `insert into moved (user_id, post_id) values ('${DONOR}', '${post.id}')`)).error).toBeUndefined()

    expect(n((await t.as(DONOR, `select count(*)::int n from moved where post_id = '${post.id}'`)).rows)).toBe(1)
    expect(n((await t.as(STAFF, `select count(*)::int n from moved where post_id = '${post.id}'`)).rows)).toBe(0)

    expect(n((await t.as(STAFF, `select moved_count('${post.id}')::int n`)).rows)).toBe(1)
    expect((await t.as(DONOR, `select moved_count('${post.id}') n`)).rows![0].n).toBeNull()
    expect((await t.as(null, `select moved_count('${post.id}') n`)).rows![0].n).toBeNull()
  })

  it("F-014: anyone logs events; only the org's staff read them; no spoofing", async () => {
    expect((await t.as(null, `insert into events (type, org_id) values ('view', '${ORG_1}')`)).error).toBeUndefined()
    expect((await t.as(DONOR, `insert into events (type, org_id, user_id) values ('share', '${ORG_1}', '${DONOR}')`)).error).toBeUndefined()

    const spoof = await t.as(DONOR, `insert into events (type, org_id, user_id) values ('view', '${ORG_1}', '${STAFF}')`)
    expect(spoof.error).toMatch(/row-level security/)
    const badType = await t.as(null, `insert into events (type, org_id) values ('like', '${ORG_1}')`)
    expect(badType.error).toMatch(/check constraint/)

    expect(n((await t.as(null, `select count(*)::int n from events`)).rows)).toBe(0)
    expect(n((await t.as(DONOR, `select count(*)::int n from events`)).rows)).toBe(0)
    expect(n((await t.as(STAFF, `select count(*)::int n from events where org_id = '${ORG_1}'`)).rows)).toBeGreaterThanOrEqual(2)
  })
})

describe("storage", () => {
  it("F-018: staff upload post images only into their own org's folder", async () => {
    const own = await t.as(STAFF, `insert into storage.objects (bucket_id, name) values ('post-images', '${ORG_1}/photo.jpg')`)
    expect(own.error).toBeUndefined()

    const other = await t.as(STAFF, `insert into storage.objects (bucket_id, name) values ('post-images', '${ORG_2}/photo.jpg')`)
    expect(other.error).toMatch(/row-level security/)

    const donor = await t.as(DONOR, `insert into storage.objects (bucket_id, name) values ('post-images', '${ORG_1}/photo.jpg')`)
    expect(donor.error).toMatch(/row-level security/)
  })
})

describe("upload cleanup", () => {
  it("F-031: lists only photos older than a day that no post uses, and only to the service role", async () => {
    const used = `${ORG_1}/aaaaaaaa-0000-4000-8000-000000000001.jpg`
    const orphanOld = `${ORG_1}/aaaaaaaa-0000-4000-8000-000000000002.jpg`
    const orphanNew = `${ORG_1}/aaaaaaaa-0000-4000-8000-000000000003.jpg`
    await t.owner(`insert into storage.objects (bucket_id, name, created_at) values
      ('post-images', '${used}', now() - interval '3 days'),
      ('post-images', '${orphanOld}', now() - interval '3 days'),
      ('post-images', '${orphanNew}', now() - interval '1 hour'),
      ('other-bucket', 'old.jpg', now() - interval '3 days')`)
    await t.owner(`insert into posts (org_id, body, image_paths, image_alts, beneficiary_consent) values ('${ORG_1}', 'uses a photo', '{${used}}', '{photo}', true)`)

    const listed = await t.asService(`select name from orphan_post_images()`)
    expect(listed.rows!.map((r) => r.name)).toEqual([orphanOld])

    expect((await t.as(STAFF, `select * from orphan_post_images()`)).error).toMatch(/permission denied/)
    expect((await t.as(null, `select * from orphan_post_images()`)).error).toMatch(/permission denied/)
  })
})
