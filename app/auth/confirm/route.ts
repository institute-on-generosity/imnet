import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { safeNext } from "@/lib/safe-next"
import { createClient } from "@/lib/supabase/server"

// Magic-link landing: supports both PKCE (?code=) and token-hash links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNext(searchParams.get("next"))

  const supabase = await createClient()
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing auth parameters") }

  // String concat, not new URL(next, origin): a path can never change the host.
  return NextResponse.redirect(`${origin}${error ? "/login?error=link" : next}`)
}
