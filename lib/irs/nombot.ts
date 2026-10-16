import "server-only"
import type { IrsOrg } from "./check"

// F-109 NomBot (public IRS data) over HTTP. NOMBOT_URL is server-side only; without it, or if
// NomBot is down, lookups return null and the UI simply leaves the IRS parts out.
const BASE = process.env.NOMBOT_URL?.replace(/\/$/, "")
export const nombotPublicUrl = (path: string) => (BASE ? `${process.env.NOMBOT_PUBLIC_URL?.replace(/\/$/, "") || BASE}${path}` : null)

export async function lookupIrsOrg(einRaw: string | null | undefined): Promise<IrsOrg | null> {
  const ein = (einRaw ?? "").replace(/\D/g, "")
  if (!BASE || ein.length !== 9) return null
  try {
    const res = await fetch(`${BASE}/api/v1/org/${ein}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 86_400 } })
    if (!res.ok) return null
    return (await res.json()) as IrsOrg
  } catch {
    return null
  }
}
