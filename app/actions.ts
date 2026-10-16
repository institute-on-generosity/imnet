"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { draftProfileFromWebsite, fetchWebsiteText, suggestCauses } from "@/lib/ai/assists"
import { toEmbed } from "@/lib/embeds"
import { formValues } from "@/lib/form-values"
import { validateImages } from "@/lib/post-images"
import { thread } from "@/lib/comments"
import { parseEventFields } from "@/lib/events"
import { parseGiftFields } from "@/lib/gifts"
import { parseGrantFields } from "@/lib/grants"
import { parseStatFields } from "@/lib/impact-stat-fields"
import { logoPathIsValid } from "@/lib/logo"
import { orgCoverPathIsValid, personCoverPath } from "@/lib/cover"
import { parseNeedFields } from "@/lib/needs"
import { parseFoundedYear, parsePrograms } from "@/lib/profile-fields"
import { parseHoursFields } from "@/lib/volunteer"
import { parseCallFields, type CallFields } from "@/lib/open-call-fields"
import { parseCallActionFields, type CallActionFields } from "@/lib/call-fields"
import { todayISO } from "@/lib/open-calls"
import { charge, feeCents, MAX_USD, MIN_USD } from "@/lib/payments/test-gateway"
import { displayName, isFoundationRecord } from "@/lib/irs/check"
import { lookupIrsOrg } from "@/lib/irs/nombot"
import { safeNext } from "@/lib/safe-next"
import { escapeLike } from "@/lib/search"
import { donorBadgeHint, getComments, getMessages, getPost, getViewer, isOrgStaff, type ChatMessage } from "@/lib/queries"
import { createClient, getUserId } from "@/lib/supabase/server"

// values: what the user typed, sent back on error so forms can refill (React 19 resets forms after an action).
export type ActionState = { ok?: boolean; error?: string; message?: string; values?: Record<string, string>; id?: string } | null

function fail(form: FormData, error: string): ActionState {
  return { error, values: formValues(form) }
}

async function requireUser() {
  const userId = await getUserId()
  if (!userId) redirect("/login")
  return userId
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function sendMagicLink(_: ActionState, form: FormData): Promise<ActionState> {
  const email = z.email().safeParse(form.get("email"))
  if (!email.success) return fail(form, "Enter a valid email.")
  const next = safeNext(form.get("next"))
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}` },
  })
  if (error) return fail(form, error.message)
  return { ok: true, message: "Check your email for a sign-in link." }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

// ---------------------------------------------------------------------------
// Donor actions
// ---------------------------------------------------------------------------
export async function logEvent(type: "view" | "share" | "donate_click", orgId: string, postId?: string) {
  const supabase = await createClient()
  const userId = await getUserId()
  await supabase.from("events").insert({ type, org_id: orgId, post_id: postId ?? null, user_id: userId })
}

export async function reportPost(postId: string, reason: string) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("reports").insert({ post_id: postId, reporter_id: userId, reason: reason.slice(0, 1000) })
}

// ---------------------------------------------------------------------------
// Nonprofit staff
// ---------------------------------------------------------------------------
const ClaimSchema = z.object({
  org_type: z.enum(["nonprofit", "foundation"], { message: "Choose nonprofit or foundation." }),
  org_name: z.string().trim().min(2).max(200),
  ein: z.string().trim().regex(/^\d{2}-?\d{7}$/, "EIN looks like 12-3456789"),
  website: z.url({ protocol: /^https$/ }),
  work_email: z.email(),
  note: z.string().max(1000).optional(),
})

export async function submitClaim(_: ActionState, form: FormData): Promise<ActionState> {
  const userId = await requireUser()
  const parsed = ClaimSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return fail(form, parsed.error.issues[0].message)

  // Work email must be on the org's own domain (admin still reviews every claim).
  const siteHost = new URL(parsed.data.website).hostname.replace(/^www\./, "")
  const emailHost = parsed.data.work_email.split("@")[1].toLowerCase()
  if (emailHost !== siteHost && !emailHost.endsWith(`.${siteHost}`)) {
    return fail(form, `Use an email on ${siteHost} so we can verify you work there.`)
  }

  const supabase = await createClient()
  const { error } = await supabase.from("org_claims").insert({ ...parsed.data, user_id: userId })
  if (error) return fail(form, error.message)
  revalidatePath("/dashboard")
  return { ok: true, message: "Claim submitted. We'll review it shortly." }
}

const OrgSchema = z.object({
  name: z.string().trim().min(2).max(200),
  about: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(80).optional(),
  team_size: z.string().trim().max(80).optional(),
  mission: z.string().max(1000).optional(),
  what_gifts_fund: z.string().max(1000).optional(),
  everyorg_slug: z.string().regex(/^[\w-]*$/).max(100).optional(),
})

export async function updateOrg(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = OrgSchema.safeParse({
    name: form.get("name"),
    mission: form.get("mission") ?? undefined,
    what_gifts_fund: form.get("what_gifts_fund") ?? undefined,
    everyorg_slug: form.get("everyorg_slug") ?? undefined,
    about: form.get("about") ?? undefined,
    location: form.get("location") ?? undefined,
    team_size: form.get("team_size") ?? undefined,
  })
  if (!parsed.success) return fail(form, parsed.error.issues[0].message)
  const programs = parsePrograms(String(form.get("programs") ?? ""))
  if ("error" in programs) return fail(form, programs.error)
  const founded = parseFoundedYear(String(form.get("founded_year") ?? ""), new Date().getFullYear())
  if ("error" in founded) return fail(form, founded.error)
  const details = {
    about: parsed.data.about || null, location: parsed.data.location || null, team_size: parsed.data.team_size || null,
    programs: programs.programs, founded_year: founded.year,
  }

  // Cover: a fresh upload in the org's folder, "remove", or unchanged (same rules as the logo).
  const coverPath = String(form.get("cover_path") ?? "")
  let cover: { cover_url?: string | null } = {}
  if (form.get("remove_cover") === "on") cover = { cover_url: null }
  else if (coverPath) {
    if (!orgCoverPathIsValid(orgId, coverPath)) return fail(form, "The cover upload didn't finish. Try again.")
    cover = { cover_url: coverPath }
  }

  // Logo: a fresh upload in the org's folder, "remove", or unchanged.
  const logoPath = String(form.get("logo_path") ?? "")
  let logo: { logo_url?: string | null } = {}
  if (form.get("remove_logo") === "on") logo = { logo_url: null }
  else if (logoPath) {
    if (!logoPathIsValid(orgId, logoPath)) return fail(form, "The logo upload didn't finish. Try again.")
    logo = { logo_url: logoPath }
  }

  const supabase = await createClient()
  const { name, mission, what_gifts_fund, everyorg_slug } = parsed.data
  const { error } = await supabase
    .from("orgs")
    .update({ name, mission, what_gifts_fund, everyorg_slug, ...details, ...logo, ...cover })
    .eq("id", orgId)
    .select("slug")
    .single()
  if (error) return fail(form, error.message)

  const causes = form.getAll("causes").map(String)
  await supabase.from("org_causes").delete().eq("org_id", orgId)
  if (causes.length) {
    await supabase.from("org_causes").insert(causes.map((cause_slug) => ({ org_id: orgId, cause_slug })))
  }
  revalidatePath("/", "layout")
  return { ok: true, message: "Profile saved." }
}

const PostSchema = z.object({
  kind: z.enum(["update", "impact_story", "ask", "open_call", "call_volunteers", "call_donations"]),
  body: z.string().trim().min(1).max(5000),
  embed: z.string().optional(),
})

export async function createPost(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const userId = await requireUser()
  const parsed = PostSchema.safeParse({ kind: form.get("kind"), body: form.get("body"), embed: form.get("embed") || undefined })
  if (!parsed.success) return fail(form, parsed.error.issues[0].message)

  let embed_url: string | null = null
  if (parsed.data.embed) {
    const embed = toEmbed(parsed.data.embed)
    if (!embed) return fail(form, "Video link must be YouTube, Vimeo, Instagram or Wikimedia Commons.")
    embed_url = embed.src
  }

  const images = validateImages(orgId, form.getAll("image_paths").map(String), form.getAll("image_alts").map(String))
  if ("error" in images) return fail(form, images.error)
  const consent = form.get("beneficiary_consent") === "on"
  if (images.paths.length > 0 && !consent) return fail(form, "Confirm consent before posting photos.")

  const grantFields = parseGrantFields(
    form.getAll("grantee_ids").map(String),
    form.getAll("grant_amounts").map(String),
    form.getAll("grant_purposes").map(String),
  )
  if ("error" in grantFields) return fail(form, grantFields.error)

  let call: CallFields | Record<string, never> = {}
  if (parsed.data.kind === "open_call") {
    const parsedCall = parseCallFields(
      {
        deadline: String(form.get("call_deadline") ?? ""),
        applyUrl: String(form.get("call_apply_url") ?? ""),
        maxAward: String(form.get("call_max_award") ?? ""),
        causes: form.getAll("call_causes").map(String),
      },
      todayISO(),
    )
    if ("error" in parsedCall) return fail(form, parsedCall.error)
    call = parsedCall.fields
  }

  let actionFields: CallActionFields | Record<string, never> = {}
  if (parsed.data.kind === "call_volunteers" || parsed.data.kind === "call_donations") {
    const a = parseCallActionFields(parsed.data.kind, { url: String(form.get("action_url") ?? ""), date: String(form.get("action_date") ?? ""), goal: String(form.get("goal_usd") ?? "") }, todayISO())
    if ("error" in a) return fail(form, a.error)
    actionFields = a.fields
  }

  const reportsGrant = String(form.get("reports_grant_id") ?? "")
  if (reportsGrant && !/^[0-9a-f-]{36}$/.test(reportsGrant)) return fail(form, "Pick a grant from the list.")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .insert({
      org_id: orgId,
      author_id: userId,
      kind: parsed.data.kind,
      body: parsed.data.body,
      embed_url,
      image_paths: images.paths,
      image_alts: images.alts,
      beneficiary_consent: consent,
      reports_grant_id: reportsGrant || null,
      ...call,
      ...actionFields,
    })
    .select("id")
    .single()
  if (error) return fail(form, error.message)

  // Foundations can tag grantees; each grant waits for the nonprofit to confirm it.
  if (grantFields.grants.length) {
    const { error: grantError } = await supabase
      .from("grants")
      .insert(grantFields.grants.map((g) => ({ ...g, foundation_id: orgId, post_id: data.id, created_by: userId })))
    if (grantError) return { ok: true, id: data.id, message: `Posted, but the grants weren't saved: ${grantError.message}` }
  }
  revalidatePath("/")
  return {
    ok: true,
    id: data.id,
    message: grantFields.grants.length ? "Posted. Grants show once each nonprofit confirms them." : "Posted.",
  }
}

export async function updatePostBody(postId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const body = z.string().trim().min(1, "Write something first.").max(5000).safeParse(form.get("body"))
  if (!body.success) return fail(form, body.error.issues[0].message)
  const supabase = await createClient()
  const { data, error } = await supabase.from("posts").update({ body: body.data }).eq("id", postId).select("id")
  if (error) return fail(form, error.message)
  if (!data?.length) return fail(form, "You can only edit your organization's posts.")
  revalidatePath("/", "layout")
  return { ok: true, message: "Saved." }
}

export async function deletePost(postId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("posts").delete().eq("id", postId)
  revalidatePath("/", "layout")
}

export async function markNotificationsSeen() {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", userId)
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export async function createInvite(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const userId = await requireUser()
  const email = z.email("Enter your colleague's email.").safeParse(String(form.get("email") ?? "").trim())
  if (!email.success) return fail(form, email.error.issues[0].message)
  const supabase = await createClient()
  const { error } = await supabase.from("org_invites").insert({ org_id: orgId, email: email.data, invited_by: userId })
  if (error) return fail(form, error.code === "23505" ? "That email already has an invite." : error.message)
  revalidatePath(`/dashboard/${orgId}`)
  return { ok: true, message: "Invite created. Copy the link and send it to them." }
}

export async function revokeInvite(inviteId: string, orgId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("org_invites").delete().eq("id", inviteId)
  revalidatePath(`/dashboard/${orgId}`)
}

export async function removeMember(orgId: string, userId: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("remove_org_member", { target_org: orgId, target_user: userId })
  if (error) throw error
  revalidatePath(`/dashboard/${orgId}`)
}

export async function acceptInvite(token: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: orgId, error } = await supabase.rpc("accept_org_invite", { invite_token: token })
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`)
  redirect(`/dashboard/${orgId}`)
}

// ---------------------------------------------------------------------------
// Impact stats (every figure needs a source)
// ---------------------------------------------------------------------------
export async function addImpactStat(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = parseStatFields(
    {
      label: String(form.get("label") ?? ""),
      value: String(form.get("value") ?? ""),
      sourceUrl: String(form.get("source_url") ?? ""),
      asOf: String(form.get("as_of") ?? ""),
    },
    todayISO(),
  )
  if ("error" in parsed) return fail(form, parsed.error)
  const supabase = await createClient()
  const { count } = await supabase.from("impact_stats").select("*", { count: "exact", head: true }).eq("org_id", orgId)
  const { data, error } = await supabase.from("impact_stats").insert({ ...parsed.fields, org_id: orgId, sort: count ?? 0 }).select("id").single()
  if (error) return fail(form, error.message)
  revalidatePath("/", "layout")
  return { ok: true, id: data.id, message: "Added." }
}

export async function deleteImpactStat(statId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("impact_stats").delete().eq("id", statId)
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// Grants
// ---------------------------------------------------------------------------
export async function searchGrantees(q: string) {
  await requireUser()
  const term = q.trim().slice(0, 100)
  if (term.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_url, org_type")
    .eq("status", "verified")
    .eq("org_type", "nonprofit")
    .ilike("name", `%${escapeLike(term)}%`)
    .order("name")
    .limit(8)
  return data ?? []
}

export async function confirmGrant(grantId: string, orgId: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("confirm_grant", { target: grantId })
  if (error) throw error
  revalidatePath(`/dashboard/${orgId}`)
  revalidatePath("/", "layout")
}

export async function declineGrant(grantId: string, orgId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("grants").delete().eq("id", grantId)
  revalidatePath(`/dashboard/${orgId}`)
}

// ---------------------------------------------------------------------------
// AI assists (suggestions only; staff edit and save)
// ---------------------------------------------------------------------------
export async function draftProfile(orgId: string) {
  const userId = await requireUser()
  const supabase = await createClient()
  const { data: member } = await supabase
    .from("org_members")
    .select("user_id")
    .match({ org_id: orgId, user_id: userId })
    .maybeSingle()
  if (!member) return { error: "Only this org's staff can do that." }
  const { data: org } = await supabase.from("orgs").select("name, website").eq("id", orgId).single()
  if (!org?.website) return { error: "Add a website first." }
  const [text, { data: causes }] = await Promise.all([
    fetchWebsiteText(org.website),
    supabase.from("causes").select("slug, name"),
  ])
  const [draft, suggested] = await Promise.all([
    draftProfileFromWebsite(org.name, text),
    suggestCauses(text, causes ?? []),
  ])
  return { draft, causes: suggested }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function approveClaim(claimId: string, form: FormData) {
  await requireUser()
  const slug = z.string().regex(/^[a-z0-9-]{2,60}$/).parse(form.get("slug"))
  const supabase = await createClient()
  const { error } = await supabase.rpc("approve_claim", { claim: claimId, new_slug: slug })
  if (error) throw error
  revalidatePath("/admin")
}

export async function rejectClaim(claimId: string) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase
    .from("org_claims")
    .update({ status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("id", claimId)
  revalidatePath("/admin")
}

// ---------------------------------------------------------------------------
// Needs (F-051)
// ---------------------------------------------------------------------------
export async function addNeed(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = parseNeedFields({
    kind: String(form.get("kind") ?? ""),
    title: String(form.get("title") ?? ""),
    detail: String(form.get("detail") ?? ""),
    helpUrl: String(form.get("help_url") ?? ""),
  })
  if ("error" in parsed) return fail(form, parsed.error)
  const supabase = await createClient()
  const { data, error } = await supabase.from("org_needs").insert({ ...parsed.fields, org_id: orgId }).select("id").single()
  if (error) return fail(form, error.message)
  revalidatePath("/", "layout")
  return { ok: true, id: data.id, message: "Added." }
}

export async function setNeedMet(needId: string, met: boolean) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("org_needs").update({ met_at: met ? new Date().toISOString() : null }).eq("id", needId)
  revalidatePath("/", "layout")
}

export async function deleteNeed(needId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("org_needs").delete().eq("id", needId)
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// Giving journal (F-052): private to the donor
// ---------------------------------------------------------------------------
export async function addGift(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = parseGiftFields(
    {
      orgId: String(form.get("org_id") ?? ""),
      amount: String(form.get("amount") ?? ""),
      givenOn: String(form.get("given_on") ?? ""),
      note: String(form.get("note") ?? ""),
    },
    todayISO(),
  )
  if ("error" in parsed) return fail(form, parsed.error)
  const supabase = await createClient()
  const { data, error } = await supabase.from("gifts").insert(parsed.fields).select("id").single()
  if (error) return fail(form, error.message)
  revalidatePath("/giving")
  return { ok: true, id: data.id, message: "Logged." }
}

export async function setDonorBadge(on: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("profiles").update({ donor_badge: on }).eq("id", userId)
  revalidatePath("/", "layout")
}

export async function setGivingTotals(on: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("profiles").update({ show_giving_totals: on }).eq("id", userId)
  revalidatePath("/", "layout")
}

export async function deleteGift(giftId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("gifts").delete().eq("id", giftId)
  revalidatePath("/giving")
}

// ---------------------------------------------------------------------------
// Thank-you notes (F-053): seen only by the author and the org's staff
// ---------------------------------------------------------------------------
export async function sendThanks(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const body = z.string().trim().min(1, "Write a short note first.").max(500, "Keep it under 500 characters.").safeParse(form.get("body"))
  if (!body.success) return fail(form, body.error.issues[0].message)
  const supabase = await createClient()
  const { error } = await supabase.from("thanks").insert({ org_id: orgId, body: body.data })
  if (error) return fail(form, error.message)
  revalidatePath(`/dashboard/${orgId}`)
  return { ok: true, message: "Sent. Only their team will see it." }
}

export async function deleteThanks(noteId: string, orgId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("thanks").delete().eq("id", noteId)
  revalidatePath(`/dashboard/${orgId}`)
}

// ---------------------------------------------------------------------------
// Events (F-058); RSVPs go through /api/signals
// ---------------------------------------------------------------------------
export async function addEvent(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = parseEventFields(
    {
      title: String(form.get("title") ?? ""),
      startsLocal: String(form.get("starts_local") ?? ""),
      tzOffset: String(form.get("tz_offset") ?? ""),
      location: String(form.get("location") ?? ""),
      detail: String(form.get("detail") ?? ""),
    },
    new Date(),
  )
  if ("error" in parsed) return fail(form, parsed.error)
  const supabase = await createClient()
  const { data, error } = await supabase.from("org_events").insert({ ...parsed.fields, org_id: orgId }).select("id").single()
  if (error) return fail(form, error.message)
  revalidatePath("/", "layout")
  return { ok: true, id: data.id, message: "Added." }
}

export async function deleteEvent(eventId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("org_events").delete().eq("id", eventId)
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// Comments (F-062)
// ---------------------------------------------------------------------------
// Load a post's thread plus who is viewing (for the composer's avatar and "comment as" switch).
export async function loadComments(postId: string) {
  const userId = await getUserId()
  const post = await getPost(postId)
  if (!post) return null
  const [comments, isStaff, viewer, donorHint] = await Promise.all([
    getComments(postId),
    post.org_id ? isOrgStaff(userId, post.org_id) : false,
    getViewer(userId),
    post.org_id ? donorBadgeHint(userId, post.org_id) : false,
  ])
  return {
    threads: thread(comments),
    isStaff,
    donorHint,
    viewer: viewer ? { id: viewer.id, handle: viewer.handle, name: viewer.display_name ?? `@${viewer.handle}`, avatarUrl: viewer.avatar_url } : null,
  }
}

export async function postComment(input: { postId: string; parentId?: string | null; body: string; asOrg?: boolean }): Promise<{ error?: string }> {
  await requireUser()
  const body = z.string().trim().min(1, "Write a comment first.").max(1000, "Keep it under 1,000 characters.").safeParse(input.body)
  if (!body.success) return { error: body.error.issues[0].message }
  if (input.parentId && !/^[0-9a-f-]{36}$/.test(input.parentId)) return { error: "That comment is gone." }
  const supabase = await createClient()
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: input.postId, parent_id: input.parentId ?? null, body: body.data, as_org: !!input.asOrg })
  if (error) return { error: error.message.includes("row-level security") ? "You can't comment on this post." : error.message }
  revalidatePath(`/p/${input.postId}`)
  return {}
}

export async function deleteComment(commentId: string, postId: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("comments").delete().eq("id", commentId)
  revalidatePath(`/p/${postId}`)
}

// ---------------------------------------------------------------------------
// Your profile (F-073)
// ---------------------------------------------------------------------------
const MyProfileSchema = z.object({
  display_name: z.string().trim().min(1, "Add your name.").max(80),
  bio: z.string().trim().max(160, "Keep your headline under 160 characters."),
  location: z.string().trim().max(80),
  about: z.string().trim().max(2000, "Keep About under 2,000 characters."),
})

export async function updateMyProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const userId = await requireUser()
  const parsed = MyProfileSchema.safeParse({
    display_name: String(form.get("display_name") ?? ""),
    bio: String(form.get("bio") ?? ""),
    location: String(form.get("location") ?? ""),
    about: String(form.get("about") ?? ""),
  })
  if (!parsed.success) return fail(form, parsed.error.issues[0].message)
  const coverKey = String(form.get("cover") ?? "")
  const cover_url = coverKey ? personCoverPath(coverKey) : null
  if (coverKey && !cover_url) return fail(form, "Pick a cover from the list.")
  const avatar = form.get("new_avatar") === "on" ? { avatar_url: `/avatars/u${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}` } : {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name, bio: parsed.data.bio || null, location: parsed.data.location || null,
      about: parsed.data.about || null, cover_url, ...avatar,
    })
    .eq("id", userId)
    .select("handle")
    .single()
  if (error) return fail(form, error.message)
  const causes = form.getAll("causes").map(String)
  await supabase.from("profile_causes").delete().eq("user_id", userId)
  if (causes.length) await supabase.from("profile_causes").insert(causes.map((cause_slug) => ({ user_id: userId, cause_slug })))
  revalidatePath("/", "layout")
  redirect(`/u/${data.handle}`)
}

// ---------------------------------------------------------------------------
// Donor posts (F-079): people post as themselves, optionally spotlighting an org
// ---------------------------------------------------------------------------
export async function createDonorPost(_: ActionState, form: FormData): Promise<ActionState> {
  const userId = await requireUser()
  const body = z.string().trim().min(1, "Write something first.").max(3000, "Keep it under 3,000 characters.").safeParse(form.get("body"))
  if (!body.success) return fail(form, body.error.issues[0].message)
  const about = String(form.get("about_org_id") ?? "")
  if (about && !/^[0-9a-f-]{36}$/.test(about)) return fail(form, "Pick an organization from the list.")
  const images = validateImages(`people/${userId}`, form.getAll("image_paths").map(String), form.getAll("image_alts").map(String))
  if ("error" in images) return fail(form, images.error)
  const consent = form.get("beneficiary_consent") === "on"
  if (images.paths.length > 0 && !consent) return fail(form, "Confirm consent before posting photos.")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body: body.data, about_org_id: about || null, image_paths: images.paths, image_alts: images.alts, beneficiary_consent: consent })
    .select("id")
    .single()
  if (error) return fail(form, error.message.includes("row-level security") ? "You can't spotlight that organization." : error.message)
  revalidatePath("/", "layout")
  return { ok: true, id: data.id, message: "Posted." }
}

export async function deleteMyPost(postId: string) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("posts").delete().match({ id: postId, author_id: userId }).is("org_id", null)
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// Volunteer hours (F-081): private log; optional totals on the profile
// ---------------------------------------------------------------------------
export async function addHours(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = parseHoursFields(
    { orgId: String(form.get("org_id") ?? ""), hours: String(form.get("hours") ?? ""), servedOn: String(form.get("served_on") ?? ""), note: String(form.get("note") ?? "") },
    todayISO(),
  )
  if ("error" in parsed) return fail(form, parsed.error)
  const supabase = await createClient()
  const { data, error } = await supabase.from("volunteer_hours").insert(parsed.fields).select("id").single()
  if (error) return fail(form, error.message)
  revalidatePath("/giving")
  return { ok: true, id: data.id, message: "Logged." }
}

export async function deleteHours(id: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("volunteer_hours").delete().eq("id", id)
  revalidatePath("/giving")
}

export async function setVolunteerHours(on: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("profiles").update({ show_volunteer_hours: on }).eq("id", userId)
  revalidatePath("/", "layout")
}

export async function reviewHours(id: string, orgId: string, confirm: boolean) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("review_volunteer_hours", { target: id, confirm })
  if (error) throw error
  revalidatePath(`/dashboard/${orgId}`)
  revalidatePath("/", "layout")
}

// Local development only: one-click sign-in for the developer's own account. Works only when
// DEV_LOGIN_EMAIL/DEV_LOGIN_PASSWORD are set (in .env.local) and Supabase is local.
export async function devSignIn(next: string) {
  const email = process.env.DEV_LOGIN_EMAIL, password = process.env.DEV_LOGIN_PASSWORD
  const local = /\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  if (!email || !password || !local) redirect("/login")
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect(safeNext(next))
}

// Follow or unfollow a cause (F-088): your causes shape the Following page and suggestions.
export async function setCauseFollow(slug: string, on: boolean) {
  const userId = await requireUser()
  if (!/^[a-z-]{2,40}$/.test(slug)) return
  const supabase = await createClient()
  const { error } = on
    ? await supabase.from("profile_causes").upsert({ user_id: userId, cause_slug: slug }, { onConflict: "user_id,cause_slug", ignoreDuplicates: true })
    : await supabase.from("profile_causes").delete().match({ user_id: userId, cause_slug: slug })
  if (error) throw new Error("Couldn't save") // the cause card reverts (B-037)
  revalidatePath("/following")
  revalidatePath("/", "layout")
}

// ---------------------------------------------------------------------------
// F-099 Donate through imnet (test mode). With a real processor the card would go straight to the
// processor's hosted fields and never reach this server; in test mode only test numbers are used
// and nothing but brand and last four is kept. The gift also lands in the giving journal.
// ---------------------------------------------------------------------------
const DonationInput = z.object({
  orgId: z.string().uuid(),
  amountUsd: z.number().int().min(MIN_USD).max(MAX_USD),
  monthly: z.boolean(),
  coverFees: z.boolean(),
  anonymous: z.boolean(),
  card: z.object({ number: z.string().max(30), exp: z.string().max(10), cvc: z.string().max(6), zip: z.string().max(12).optional() }),
})
export type DonationReceipt = { id: string; orgName: string; amountCents: number; feeCents: number; monthly: boolean; brand: string; last4: string; ref: string; createdAt: string }

export async function donate(input: z.infer<typeof DonationInput>): Promise<{ ok: true; receipt: DonationReceipt } | { ok: false; field?: "number" | "exp" | "cvc"; error: string }> {
  const userId = await requireUser()
  const parsed = DonationInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: `Choose an amount between $${MIN_USD} and $${MAX_USD.toLocaleString("en-US")}.` }
  const { orgId, amountUsd, monthly, coverFees, anonymous, card } = parsed.data
  const supabase = await createClient()
  const { data: org } = await supabase.from("orgs").select("id, name, slug").eq("id", orgId).maybeSingle()
  if (!org) return { ok: false, error: "That organization isn't available." }

  const result = charge(card)
  if (!result.ok) return { ok: false, field: result.field, error: result.error }
  const amountCents = amountUsd * 100
  const fee = coverFees ? feeCents(amountCents) : 0
  const { data: row, error } = await supabase
    .from("donations")
    .insert({ donor_id: userId, org_id: orgId, amount_cents: amountCents, fee_cents: fee, monthly, anonymous, provider_ref: result.ref, card_brand: result.brand, card_last4: result.last4 })
    .select("id, created_at")
    .single()
  if (error || !row) return { ok: false, error: "Couldn't record your gift. You weren't charged." }
  await supabase.from("gifts").insert({ user_id: userId, org_id: orgId, amount_usd: amountUsd, given_on: todayISO(), note: `Donated on imnet${monthly ? ", monthly" : ""} (test mode)` })

  revalidatePath("/giving")
  revalidatePath(`/o/${org.slug}`)
  return { ok: true, receipt: { id: row.id, orgName: org.name, amountCents, feeCents: fee, monthly, brand: result.brand, last4: result.last4, ref: result.ref, createdAt: row.created_at } }
}

// ---------------------------------------------------------------------------
// F-100 Groups and messages
// ---------------------------------------------------------------------------
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)

export async function createGroup(_: { error?: string } | null, form: FormData): Promise<{ error?: string } | null> {
  await requireUser()
  const name = String(form.get("name") ?? "").trim()
  const description = String(form.get("description") ?? "").trim() || null
  const cause = String(form.get("cause") ?? "") || null
  if (name.length < 3 || name.length > 80) return { error: "Give the community a name of 3 to 80 characters." }
  if (description && description.length > 500) return { error: "Keep the description under 500 characters." }
  const supabase = await createClient()
  const base = slugify(name).padEnd(3, "x")
  let slug = base
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase.from("groups").select("id").eq("slug", slug).maybeSingle()
    if (!data) break
    slug = `${base}-${i}`
  }
  const { error } = await supabase.from("groups").insert({ slug, name, description, cause_slug: cause })
  if (error) return { error: "Couldn't start the community. Try another name." }
  revalidatePath("/communities")
  redirect(`/communities/${slug}`)
}

export async function joinGroup(groupId: string, slug: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("group_members").insert({ group_id: groupId })
  revalidatePath(`/communities/${slug}`)
  revalidatePath("/communities")
}

export async function leaveGroup(groupId: string, slug: string) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase.from("group_members").delete().match({ group_id: groupId, user_id: userId })
  revalidatePath(`/communities/${slug}`)
  revalidatePath("/communities")
}

// Any well-formed id (demo ids aren't RFC-variant UUIDs, as in B-030); RLS decides access.
const ID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
const ChatTargetInput = z.union([z.object({ group: ID }), z.object({ conversation: ID })])

export async function sendMessage(target: z.infer<typeof ChatTargetInput>, body: string): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const userId = await requireUser()
  const t = ChatTargetInput.safeParse(target)
  const text = body.trim()
  if (!t.success) return { ok: false, error: "That chat isn't available." }
  if (!text || text.length > 4000) return { ok: false, error: "Messages are 1 to 4,000 characters." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messages")
    .insert({ ...("group" in t.data ? { group_id: t.data.group } : { conversation_id: t.data.conversation }), author_id: userId, body: text })
    .select("id, body, created_at, author:profiles!messages_author_id_fkey(id, handle, display_name, avatar_url)")
    .single()
  if (error || !data) return { ok: false, error: "Couldn't send. Are you still a member?" }
  await markChatRead(t.data)
  return { ok: true, message: data as unknown as ChatMessage }
}

// Polling: messages newer than `after`, and mark the chat read (you're looking at it).
export async function fetchNewMessages(target: z.infer<typeof ChatTargetInput>, after: string | null): Promise<ChatMessage[]> {
  await requireUser()
  const t = ChatTargetInput.safeParse(target)
  if (!t.success) return []
  const messages = await getMessages(t.data, after ? { after } : {})
  if (messages.length) await markChatRead(t.data)
  return messages
}

export async function markChatRead(target: z.infer<typeof ChatTargetInput>) {
  const userId = await requireUser()
  const supabase = await createClient()
  const now = new Date().toISOString()
  if ("group" in target) await supabase.from("group_members").update({ last_read_at: now }).match({ group_id: target.group, user_id: userId })
  else await supabase.from("conversation_members").update({ last_read_at: now }).match({ conversation_id: target.conversation, user_id: userId })
}

export async function deleteMessage(id: string) {
  await requireUser()
  const supabase = await createClient()
  await supabase.from("messages").delete().eq("id", id)
}

export async function startConversation(otherId: string) {
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("start_conversation", { other: otherId })
  if (error || !data) redirect("/messages?error=not-allowed")
  redirect(`/messages/${data}`)
}

// ---------------------------------------------------------------------------
// F-109 Look up an EIN in IRS records (NomBot) while claiming an organization. Public data only.
// ---------------------------------------------------------------------------
export type EinLookup = { name: string; city: string | null; state: string | null; taxExempt: string | null; since: string | null; foundation: boolean } | null
export async function lookupEin(ein: string): Promise<EinLookup> {
  await requireUser()
  const irs = await lookupIrsOrg(ein)
  if (!irs) return null
  return {
    name: displayName(irs.name), city: irs.city ? displayName(irs.city) : null, state: irs.state,
    taxExempt: irs.subsection ? `501(c)(${Number(irs.subsection)})` : null, since: irs.ruling, foundation: isFoundationRecord(irs),
  }
}
