import "server-only"
import { createClient } from "@/lib/supabase/server"

// Small, idempotent "set" operations behind the keepalive /api/signals endpoint.
// RLS still decides what each user may change.
export type Signal = { kind: "follow" | "follow_person" | "supporter" | "moved" | "saved" | "rsvp" | "interest"; id: string; on: boolean }

export async function applySignal(userId: string, s: Signal): Promise<{ error?: string }> {
  const supabase = await createClient()
  if (s.kind === "follow") {
    const { error } = s.on
      ? await supabase.from("follows").upsert({ user_id: userId, org_id: s.id }, { onConflict: "user_id,org_id", ignoreDuplicates: true })
      : await supabase.from("follows").delete().match({ user_id: userId, org_id: s.id })
    return { error: error?.message }
  }
  if (s.kind === "follow_person") {
    const { error } = s.on
      ? await supabase.from("person_follows").upsert({ follower_id: userId, followee_id: s.id }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true })
      : await supabase.from("person_follows").delete().match({ follower_id: userId, followee_id: s.id })
    return { error: error?.message }
  }
  if (s.kind === "supporter") {
    // Showing support implies following; hiding it keeps the (private) follow.
    const { error } = s.on
      ? await supabase.from("follows").upsert({ user_id: userId, org_id: s.id, supporter: true }, { onConflict: "user_id,org_id" })
      : await supabase.from("follows").update({ supporter: false }).match({ user_id: userId, org_id: s.id })
    return { error: error?.message }
  }
  // Private one-row toggles: (user, target) pairs.
  const { table, column } = {
    saved: { table: "saved_posts", column: "post_id" },
    moved: { table: "moved", column: "post_id" },
    rsvp: { table: "event_rsvps", column: "event_id" },
    interest: { table: "need_interest", column: "need_id" },
  }[s.kind]
  const row = { user_id: userId, [column]: s.id }
  const { error } = s.on
    ? await supabase.from(table).upsert(row, { onConflict: `user_id,${column}`, ignoreDuplicates: true })
    : await supabase.from(table).delete().match(row)
  return { error: error?.message }
}
