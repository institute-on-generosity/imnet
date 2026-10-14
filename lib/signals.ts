import "server-only"
import { createClient } from "@/lib/supabase/server"

// Small, idempotent "set" operations behind the keepalive /api/signals endpoint.
// RLS still decides what each user may change.
export type Signal = { kind: "follow" | "supporter" | "moved" | "saved"; id: string; on: boolean }

export async function applySignal(userId: string, s: Signal): Promise<{ error?: string }> {
  const supabase = await createClient()
  if (s.kind === "follow") {
    const { error } = s.on
      ? await supabase.from("follows").upsert({ user_id: userId, org_id: s.id }, { onConflict: "user_id,org_id", ignoreDuplicates: true })
      : await supabase.from("follows").delete().match({ user_id: userId, org_id: s.id })
    return { error: error?.message }
  }
  if (s.kind === "supporter") {
    // Showing support implies following; hiding it keeps the (private) follow.
    const { error } = s.on
      ? await supabase.from("follows").upsert({ user_id: userId, org_id: s.id, supporter: true }, { onConflict: "user_id,org_id" })
      : await supabase.from("follows").update({ supporter: false }).match({ user_id: userId, org_id: s.id })
    return { error: error?.message }
  }
  const table = s.kind === "saved" ? "saved_posts" : "moved"
  const { error } = s.on
    ? await supabase.from(table).upsert({ user_id: userId, post_id: s.id }, { onConflict: "user_id,post_id", ignoreDuplicates: true })
    : await supabase.from(table).delete().match({ user_id: userId, post_id: s.id })
  return { error: error?.message }
}
