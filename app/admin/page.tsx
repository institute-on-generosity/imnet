import { ClaimIrsCheck } from "@/components/irs-panels"
import { Check, X } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { approveClaim, rejectClaim } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrgTypeBadge } from "@/components/org-type-badge"
import { createClient, getUserId } from "@/lib/supabase/server"

export const metadata = { title: "Admin" }

type Person = { handle: string; display_name: string | null }
// F-125: a report names a post or a person.
const personOf = (r: { person: unknown }) => (Array.isArray(r.person) ? r.person[0] : r.person) as Person | null

export default async function AdminPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")
  const supabase = await createClient()
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", userId).single()
  if (!me?.is_admin) notFound()

  const [{ data: claims }, { data: reports }] = await Promise.all([
    supabase.from("org_claims").select("id, org_name, org_type, ein, website, work_email, note, created_at").eq("status", "pending").order("created_at"),
    supabase.from("reports").select("id, reason, post_id, excerpt, conversation_id, created_at, person:profiles!reports_profile_id_fkey(handle, display_name)").eq("status", "open").order("created_at"),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
      <h1 className="h-page">Admin</h1>

      <section className="space-y-3">
        <h2 className="h-section">Pending claims ({claims?.length ?? 0})</h2>
        {(claims ?? []).map((c) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="flex items-center gap-2">{c.org_name} <OrgTypeBadge type={c.org_type} /></CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                EIN {c.ein} · <a href={c.website} className="underline" target="_blank" rel="noopener noreferrer">{c.website}</a> · {c.work_email}
              </p>
              <ClaimIrsCheck claim={c} />
              {c.note && <p>{c.note}</p>}
              <div className="flex gap-2">
                <form action={approveClaim.bind(null, c.id)} className="flex gap-2">
                  <Input name="slug" placeholder="profile-slug" required pattern="[a-z0-9-]{2,60}" className="w-48" />
                  <Button type="submit" size="sm"><Check aria-hidden />Approve</Button>
                </form>
                <form action={rejectClaim.bind(null, c.id)}>
                  <Button type="submit" size="sm" variant="destructive"><X aria-hidden />Reject</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="h-section">Open reports ({reports?.length ?? 0})</h2>
        <ul className="space-y-1 text-sm">
          {(reports ?? []).map((r) => (
            <li key={r.id}>
              {r.post_id ? <a href={`/p/${r.post_id}`} className="underline">Post</a> : <a href={`/u/${personOf(r)?.handle}`} className="underline">{personOf(r)?.display_name ?? `@${personOf(r)?.handle}`}</a>}
              {r.conversation_id && " (from messages)"}: {r.reason}
              {r.excerpt && <pre className="mt-1 rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{r.excerpt}</pre>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
