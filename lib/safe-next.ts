// Where to send someone after sign-in. Only same-site paths: "//evil.com" and "/\evil.com"
// are other sites to a browser (open redirect), so they fall back to "/".
export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 500) return "/"
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/"
  try {
    const url = new URL(raw, "http://imnet.local")
    return url.host === "imnet.local" ? `${url.pathname}${url.search}` : "/"
  } catch {
    return "/"
  }
}
