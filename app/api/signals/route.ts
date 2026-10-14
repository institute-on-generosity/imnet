import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { parseSignalRequest } from "@/lib/signal-request"
import { applySignal } from "@/lib/signals"
import { getUserId } from "@/lib/supabase/server"

// Follow, support and "moved" are sent with fetch keepalive, so they finish even if the
// person navigates away right after clicking (B-013).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = parseSignalRequest(request.headers, request.url, body)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { error } = await applySignal(userId, parsed.signal)
  if (error) return NextResponse.json({ error }, { status: 400 })
  if (parsed.signal.kind === "follow" || parsed.signal.kind === "supporter") revalidatePath("/", "layout")
  if (parsed.signal.kind === "saved") revalidatePath("/saved")
  if (parsed.signal.kind === "rsvp") revalidatePath("/events")
  return new NextResponse(null, { status: 204 })
}
