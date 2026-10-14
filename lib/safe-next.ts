// Where to send someone after sign-in. Only same-site paths: "//evil.com" and "/\evil.com"
// are other sites to a browser (open redirect), so they fall back to "/".
// The check runs on the normalized result too: "/.//evil.com" normalizes to "//evil.com" (B-017).
const sameSite = (p: string) => p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\")

export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 500 || !sameSite(raw)) return "/"
  try {
    const url = new URL(raw, "http://imnet.local")
    const out = `${url.pathname}${url.search}`
    return url.host === "imnet.local" && sameSite(out) ? out : "/"
  } catch {
    return "/"
  }
}
