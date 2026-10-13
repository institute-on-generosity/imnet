import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"

// Light, human-approved assists for Phase I. Nothing here publishes anything:
// every output is a suggestion that staff edit and accept.

let client: Anthropic | undefined
const anthropic = () => (client ??= new Anthropic())
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5"

const GROUNDING = `Use only facts stated in the provided text. Never invent numbers, names, or outcomes.
If the text does not support a field, return an empty string for it.
Write about the people served with dignity: progress and agency, not pity.`

const ProfileDraft = z.object({
  mission: z.string().describe("One or two sentences: what the org does and for whom."),
  what_gifts_fund: z.string().describe("Concrete things donations pay for, only if stated in the text."),
})

export async function draftProfileFromWebsite(orgName: string, websiteText: string) {
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: `You draft nonprofit profile copy for staff to review. ${GROUNDING}`,
    messages: [
      {
        role: "user",
        content: `Organization: ${orgName}\n\nWebsite text:\n<website>\n${websiteText}\n</website>`,
      },
    ],
    output_config: { format: zodOutputFormat(ProfileDraft) },
  })
  return res.parsed_output
}

export async function suggestCauses(text: string, allowed: { slug: string; name: string }[]) {
  const schema = z.object({ causes: z.array(z.string()) })
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 256,
    system: `Pick up to 3 cause slugs that best fit the text. Only use slugs from this list: ${allowed
      .map((c) => `${c.slug} (${c.name})`)
      .join(", ")}.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(schema) },
  })
  const valid = new Set(allowed.map((c) => c.slug))
  return (res.parsed_output?.causes ?? []).filter((s) => valid.has(s)).slice(0, 3)
}

// Fetches a public website and reduces it to plain text for drafting.
export async function fetchWebsiteText(url: string, maxChars = 20_000) {
  const parsed = new URL(url)
  if (parsed.protocol !== "https:") throw new Error("Website must use https")
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(parsed.hostname)) {
    throw new Error("Website must be public")
  }
  const res = await fetch(parsed, {
    signal: AbortSignal.timeout(8_000),
    redirect: "follow",
    headers: { "user-agent": "imnet-profile-drafter/0.1" },
  })
  if (!res.ok) throw new Error(`Website returned ${res.status}`)
  const html = (await res.text()).slice(0, 500_000)
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars)
}
