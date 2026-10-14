// Database security rules (RLS, grants, checks). Each test is named after its CONTEXT.md Ledger entry.

import { beforeAll, describe, expect, it } from "vitest"
import { ADMIN, createTestDb, DONOR, FOUNDATION, ORG_1, ORG_2, ORG_PENDING, STAFF } from "./harness"

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

  it("F-033: a claim's org type carries to the approved org; staff can't change it", async () => {
    const user = "10000000-0000-4000-8000-0000000000f3"
    await t.owner(`insert into auth.users (id, email) values ('${user}', 'grants@lake.example.org')`)
    const claim = await t.as(
      user,
      `insert into org_claims (user_id, org_type, org_name, ein, website, work_email)
       values ('${user}', 'foundation', 'Lake Fund', '55-5555555', 'https://lake.example.org', 'grants@lake.example.org') returning id`,
    )
    const approved = await t.as(ADMIN, `select approve_claim('${claim.rows![0].id}', 'lake-fund') as org_id`)
    const orgId = approved.rows![0].org_id
    expect((await t.owner(`select org_type from orgs where id = '${orgId}'`))[0].org_type).toBe("foundation")

    expect((await t.as(user, `update orgs set org_type = 'nonprofit' where id = '${orgId}'`)).error).toMatch(/permission denied/)
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

  it("F-032: a video needs a description, can't share a post with an embed, and extras need a video", async () => {
    const post = (cols: string, vals: string) =>
      t.as(STAFF, `insert into posts (org_id, author_id, body, ${cols}) values ('${ORG_1}', '${STAFF}', 'video', ${vals})`)

    expect((await post("video_path", `'${ORG_1}/a.webm'`)).error).toMatch(/video_needs_alt/)
    expect((await post("video_path, video_alt", `'${ORG_1}/a.webm', ''`)).error).toMatch(/video_needs_alt/)
    expect((await post("video_path, video_alt, embed_url", `'${ORG_1}/a.webm', 'Crew at work', 'https://player.vimeo.com/video/1'`)).error).toMatch(/one_video_per_post/)
    expect((await post("video_credit", `'Someone, CC BY'`)).error).toMatch(/video_extras_need_video/)
    expect((await post("video_path, video_alt, video_poster_path, video_credit", `'${ORG_1}/a.webm', 'Crew at work', '${ORG_1}/a.jpg', 'Someone, CC BY'`)).error).toBeUndefined()
  })

  it("F-044: staff can edit and delete their org's posts; edits are stamped; others can't", async () => {
    const [post] = await t.owner(`insert into posts (org_id, author_id, body) values ('${ORG_1}', '${STAFF}', 'first draft') returning id`)
    expect((await t.as(DONOR, `update posts set body = 'hijacked' where id = '${post.id}' returning id`)).rows ?? []).toHaveLength(0)
    expect((await t.as(STAFF, `update posts set body = 'fixed typo' where id = '${post.id}'`)).error).toBeUndefined()
    const [row] = await t.owner(`select body, edited_at from posts where id = '${post.id}'`)
    expect(row.body).toBe("fixed typo")
    expect(row.edited_at).not.toBeNull()
    expect((await t.as(DONOR, `delete from posts where id = '${post.id}' returning id`)).rows ?? []).toHaveLength(0)
    expect((await t.as(STAFF, `delete from posts where id = '${post.id}' returning id`)).rows).toHaveLength(1)
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

  it("F-046: saved posts are private to the person who saved them", async () => {
    const [post] = await t.owner(`select id from posts limit 1`)
    expect((await t.as(DONOR, `insert into saved_posts (user_id, post_id) values ('${DONOR}', '${post.id}')`)).error).toBeUndefined()
    expect(n((await t.as(DONOR, `select count(*)::int n from saved_posts`)).rows)).toBe(1)
    expect(n((await t.as(STAFF, `select count(*)::int n from saved_posts`)).rows)).toBe(0)
    expect(n((await t.as(null, `select count(*)::int n from saved_posts`)).rows)).toBe(0)
    expect((await t.as(STAFF, `insert into saved_posts (user_id, post_id) values ('${DONOR}', '${post.id}')`)).error).toMatch(/row-level security/)
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

describe("video storage", () => {
  it("F-032: staff upload videos only into their own org's folder", async () => {
    expect((await t.as(STAFF, `insert into storage.objects (bucket_id, name) values ('post-videos', '${ORG_1}/clip.webm')`)).error).toBeUndefined()
    expect((await t.as(STAFF, `insert into storage.objects (bucket_id, name) values ('post-videos', '${ORG_2}/clip.webm')`)).error).toMatch(/row-level security/)
    expect((await t.as(DONOR, `insert into storage.objects (bucket_id, name) values ('post-videos', '${ORG_1}/clip.webm')`)).error).toMatch(/row-level security/)
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

    // An org logo is in use too, even though no post references it.
    const logo = `${ORG_1}/logo-aaaaaaaa-0000-4000-8000-000000000004.png`
    await t.owner(`insert into storage.objects (bucket_id, name, created_at) values ('post-images', '${logo}', now() - interval '3 days')`)
    await t.owner(`update orgs set logo_url = 'http://127.0.0.1:54321/storage/v1/object/public/post-images/${logo}' where id = '${ORG_1}'`)

    const listed = await t.asService(`select name from orphan_post_images()`)
    expect(listed.rows!.map((r) => r.name)).toEqual([orphanOld])
    await t.owner(`update orgs set logo_url = null where id = '${ORG_1}'`)

    expect((await t.as(STAFF, `select * from orphan_post_images()`)).error).toMatch(/permission denied/)
    expect((await t.as(null, `select * from orphan_post_images()`)).error).toMatch(/permission denied/)
  })
})

describe("grants", () => {
  // FUNDER is staff of the seeded FOUNDATION; STAFF is staff of ORG_1 (a nonprofit).
  const FUNDER = "10000000-0000-4000-8000-0000000000f5"
  beforeAll(async () => {
    await t.owner(`insert into auth.users (id, email) values ('${FUNDER}', 'grants@lakeshore.example.org') on conflict do nothing`)
    await t.owner(`insert into org_members (org_id, user_id) values ('${FOUNDATION}', '${FUNDER}') on conflict do nothing`)
  })
  const give = (who: string, grantee: string, extra = "") =>
    t.as(who, `insert into grants (foundation_id, grantee_id, amount_usd, purpose, created_by${extra ? ", confirmed_at" : ""})
               values ('${FOUNDATION}', '${grantee}', 25000, 'New freezer', '${who}'${extra}) returning id`)

  it("F-034: only a foundation's staff can record its grants, only to nonprofits, never pre-confirmed", async () => {
    expect((await give(STAFF, ORG_1)).error).toMatch(/row-level security/)
    expect((await give(FUNDER, ORG_1, ", now()")).error).toMatch(/row-level security/)
    expect((await t.as(FUNDER, `insert into grants (foundation_id, grantee_id, created_by) values ('${FOUNDATION}', '${FOUNDATION}', '${FUNDER}')`)).error).toMatch(/grant_not_self|grants go to nonprofits/)
    expect((await t.as(STAFF, `insert into grants (foundation_id, grantee_id, created_by) values ('${ORG_1}', '${ORG_2}', '${STAFF}')`)).error).toMatch(/row-level security|given by foundations/)
    expect((await give(FUNDER, ORG_1)).error).toBeUndefined()
  })

  it("F-034: unconfirmed grants are private; the grantee confirms; then they're public", async () => {
    const id = (await give(FUNDER, ORG_2)).rows![0].id
    expect((await t.as(null, `select id from grants where id = '${id}'`)).rows).toHaveLength(0)
    expect((await t.as(DONOR, `select id from grants where id = '${id}'`)).rows).toHaveLength(0)
    expect((await t.as(FUNDER, `select id from grants where id = '${id}'`)).rows).toHaveLength(1)

    // The funder can't confirm its own grant, directly or through the function.
    expect((await t.as(FUNDER, `update grants set confirmed_at = now() where id = '${id}'`)).error).toMatch(/permission denied/)
    expect((await t.as(FUNDER, `select confirm_grant('${id}')`)).error).toMatch(/not yours to confirm/)
    // Staff of a different nonprofit can't either.
    expect((await t.as(STAFF, `select confirm_grant('${id}')`)).error).toMatch(/not yours to confirm/)

    await t.owner(`insert into org_members (org_id, user_id) values ('${ORG_2}', '${DONOR}') on conflict do nothing`)
    expect((await t.as(DONOR, `select confirm_grant('${id}')`)).error).toBeUndefined()
    expect((await t.as(null, `select amount_usd from grants where id = '${id}'`)).rows).toEqual([{ amount_usd: 25000 }])
    await t.owner(`delete from org_members where org_id = '${ORG_2}' and user_id = '${DONOR}'`)
  })

  it("F-034: changing a confirmed grant's amount un-confirms it", async () => {
    const id = (await give(FUNDER, ORG_1)).rows![0].id
    expect((await t.as(STAFF, `select confirm_grant('${id}')`)).error).toBeUndefined()
    expect((await t.as(FUNDER, `update grants set amount_usd = 99999 where id = '${id}'`)).error).toBeUndefined()
    expect((await t.owner(`select confirmed_at from grants where id = '${id}'`))[0].confirmed_at).toBeNull()
  })

  it("F-036: a post can report only on a confirmed grant its own org received", async () => {
    const confirmed = String((await give(FUNDER, ORG_1)).rows![0].id)
    await t.as(STAFF, `select confirm_grant('${confirmed}')`)
    const pending = String((await give(FUNDER, ORG_1)).rows![0].id)
    const report = (grant: string, org = ORG_1, who = STAFF) =>
      t.as(who, `insert into posts (org_id, author_id, body, reports_grant_id) values ('${org}', '${who}', 'Our freezer is in', '${grant}')`)

    expect((await report(pending)).error).toMatch(/confirmed grant your organization received/)
    // The foundation can't post a "report" on its own grant.
    expect((await report(confirmed, FOUNDATION, FUNDER)).error).toMatch(/confirmed grant your organization received/)
    expect((await report(confirmed)).error).toBeUndefined()
  })

  it("F-034: the grantee can remove a grant that isn't theirs ('not ours')", async () => {
    const id = (await give(FUNDER, ORG_1)).rows![0].id
    expect((await t.as(STAFF, `delete from grants where id = '${id}' returning id`)).rows).toHaveLength(1)
    expect((await t.as(DONOR, `delete from grants where grantee_id = '${ORG_1}' returning id`)).rows).toHaveLength(0)
  })
})

describe("open calls", () => {
  const FUNDER = "10000000-0000-4000-8000-0000000000f6"
  beforeAll(async () => {
    await t.owner(`insert into auth.users (id, email) values ('${FUNDER}', 'calls@lakeshore.example.org') on conflict do nothing`)
    await t.owner(`insert into org_members (org_id, user_id) values ('${FOUNDATION}', '${FUNDER}') on conflict do nothing`)
  })
  const call = (who: string, org: string, cols: string, vals: string) =>
    t.as(who, `insert into posts (org_id, author_id, kind, body, ${cols}) values ('${org}', '${who}', 'open_call', 'Apply now', ${vals})`)

  it("F-039: only foundations post open calls, with a deadline, an apply link and real causes", async () => {
    const ok = "call_deadline, call_apply_url, call_max_award, call_causes"
    const vals = (causes = "'{hunger,housing}'") => `current_date + 30, 'https://example.org/apply', 25000, ${causes}`

    expect((await call(STAFF, ORG_1, ok, vals())).error).toMatch(/only foundations post open calls/)
    expect((await call(FUNDER, FOUNDATION, "call_apply_url", "'https://example.org/apply'")).error).toMatch(/open_call_fields/)
    expect((await call(FUNDER, FOUNDATION, "call_deadline, call_apply_url", "current_date + 30, 'ftp://x'")).error).toMatch(/check constraint/)
    expect((await call(FUNDER, FOUNDATION, ok, vals("'{hunger,not-a-cause}'"))).error).toMatch(/unknown cause/)
    expect((await call(FUNDER, FOUNDATION, ok, vals())).error).toBeUndefined()
  })

  it("F-039: ordinary posts can't carry open-call fields", async () => {
    const res = await t.as(STAFF, `insert into posts (org_id, author_id, body, call_deadline) values ('${ORG_1}', '${STAFF}', 'x', current_date)`)
    expect(res.error).toMatch(/open_call_fields/)
  })
})

describe("team invites", () => {
  const NEWBIE = "10000000-0000-4000-8000-0000000000f7"
  const STRANGER = "10000000-0000-4000-8000-0000000000f8"
  beforeAll(async () => {
    await t.owner(`insert into auth.users (id, email) values ('${NEWBIE}', 'new.colleague@harbor.example.org'), ('${STRANGER}', 'someone@else.example.com') on conflict do nothing`)
  })

  it("F-048: only staff invite; only the invited email can accept; invites are single-use", async () => {
    expect((await t.as(DONOR, `insert into org_invites (org_id, email, invited_by) values ('${ORG_1}', 'x@y.org', '${DONOR}')`)).error).toMatch(/row-level security/)
    const inv = await t.as(STAFF, `insert into org_invites (org_id, email, invited_by) values ('${ORG_1}', 'New.Colleague@harbor.example.org', '${STAFF}') returning token`)
    const token = inv.rows![0].token

    // Others can't list the org's invites; anyone with the link sees only the org name.
    expect((await t.as(DONOR, `select token from org_invites`)).rows).toHaveLength(0)
    expect((await t.as(null, `select org_name from invite_preview('${token}')`)).rows).toEqual([{ org_name: "Harbor Table (Demo)" }])

    expect((await t.as(STRANGER, `select accept_org_invite('${token}')`)).error).toMatch(/different email/)
    expect((await t.as(NEWBIE, `select accept_org_invite('${token}')`)).error).toBeUndefined()
    expect(await t.owner(`select 1 from org_members where org_id = '${ORG_1}' and user_id = '${NEWBIE}'`)).toHaveLength(1)
    expect((await t.as(NEWBIE, `select accept_org_invite('${token}')`)).error).toMatch(/already used/)
  })

  it("F-048: staff can remove a colleague, never the last member; outsiders can't remove anyone", async () => {
    expect((await t.as(DONOR, `select remove_org_member('${ORG_1}', '${NEWBIE}')`)).error).toMatch(/not your organization/)
    expect((await t.as(STAFF, `select remove_org_member('${ORG_1}', '${NEWBIE}')`)).error).toBeUndefined()
    expect((await t.as(STAFF, `select remove_org_member('${ORG_1}', '${STAFF}')`)).error).toMatch(/at least one member/)
  })
})

