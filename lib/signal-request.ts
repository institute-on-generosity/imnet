import { z } from "zod"

const SignalSchema = z.object({
  kind: z.enum(["follow", "supporter", "moved"]),
  id: z.uuid(),
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
