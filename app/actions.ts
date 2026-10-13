"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { draftProfileFromWebsite, fetchWebsiteText, suggestCauses } from "@/lib/ai/assists"
import { toEmbed } from "@/lib/embeds"
import { formValues } from "@/lib/form-values"
import { validateImages } from "@/lib/post-images"
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
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
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
export async function toggleFollow(orgId: string, slug: string, following: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  if (following) {
    await supabase.from("follows").delete().match({ user_id: userId, org_id: orgId })
  } else {
    await supabase.from("follows").insert({ user_id: userId, org_id: orgId })
  }
  revalidatePath(`/o/${slug}`)
}

export async function setSupporter(orgId: string, supporter: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  await supabase
    .from("follows")
    .upsert({ user_id: userId, org_id: orgId, supporter }, { onConflict: "user_id,org_id" })
  revalidatePath("/", "layout")
}

export async function toggleMoved(postId: string, moved: boolean) {
  const userId = await requireUser()
  const supabase = await createClient()
  if (moved) {
    await supabase.from("moved").delete().match({ user_id: userId, post_id: postId })
  } else {
    await supabase.from("moved").insert({ user_id: userId, post_id: postId })
  }
}

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
  mission: z.string().max(1000).optional(),
  what_gifts_fund: z.string().max(1000).optional(),
  everyorg_slug: z.string().regex(/^[\w-]*$/).max(100).optional(),
})

export async function updateOrg(orgId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireUser()
  const parsed = OrgSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return fail(form, parsed.error.issues[0].message)
  const supabase = await createClient()
  const { data, error } = await supabase.from("orgs").update(parsed.data).eq("id", orgId).select("slug").single()
  if (error) return fail(form, error.message)

  const causes = form.getAll("causes").map(String)
  await supabase.from("org_causes").delete().eq("org_id", orgId)
  if (causes.length) {
    await supabase.from("org_causes").insert(causes.map((cause_slug) => ({ org_id: orgId, cause_slug })))
  }
  revalidatePath(`/o/${data.slug}`)
  return { ok: true, message: "Profile saved." }
}

const PostSchema = z.object({
  kind: z.enum(["update", "impact_story", "ask"]),
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
    })
    .select("id")
    .single()
  if (error) return fail(form, error.message)
  revalidatePath("/")
  return { ok: true, message: "Posted.", id: data.id }
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
