import { z } from "zod"

const SignalSchema = z.object({
  kind: z.enum(["follow", "follow_person", "supporter", "moved", "saved", "rsvp", "interest"]),
  // Any well-formed id (demo ids use a non-RFC variant, which z.uuid() rejects); RLS decides access.
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  on: z.boolean(),
})

// Same-origin JSON only: a cross-site form can't send JSON with this content type,
// and the Origin check rejects cross-site fetches (CSRF).
export function parseSignalRequest(headers: Headers, requestUrl: string, body: unknown) {
  const origin = headers.get("origin")
  if (!origin || origin !== new URL(requestUrl).origin) return { error: "Cross-site request", status: 403 } as const
  if (!headers.get("content-type")?.startsWith("application/json")) return { error: "Expected JSON", status: 415 } as const
  const parsed = SignalSchema.safeParse(body)
  if (!parsed.success) return { error: "Invalid signal", status: 400 } as const
  return { signal: parsed.data } as const
}
