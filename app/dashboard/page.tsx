import Link from "@/components/intent-link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient, getUserId } from "@/lib/supabase/server"
import { ClaimForm } from "./claim-form"

export const metadata = { title: "For nonprofits" }

export default async function DashboardPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")
  const supabase = await createClient()

  const [{ data: memberships }, { data: claims }] = await Promise.all([
    supabase.from("org_members").select("org:orgs(id, slug, name, status)").eq("user_id", userId),
    supabase.from("org_claims").select("id, org_name, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ])
  const orgs = ((memberships ?? []) as unknown as { org: { id: string; slug: string; name: string; status: string } }[]).map((m) => m.org)

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
      <h1 className="h-page">For nonprofits</h1>

      {orgs.length > 0 && (
        <section className="space-y-3">
          <h2 className="h-section">Your organizations</h2>
          {orgs.map((o) => (
            <Link key={o.id} href={`/dashboard/${o.id}`} className="block">
              <Card className="hover:bg-muted/50"><CardHeader><CardTitle>{o.name}</CardTitle></CardHeader></Card>
            </Link>
          ))}
        </section>
      )}

      {(claims ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="h-section">Your claims</h2>
          <ul className="text-sm">
            {claims!.map((c) => <li key={c.id}>{c.org_name}: <span className="text-muted-foreground">{c.status}</span></li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="h-section">Claim your nonprofit</h2>
        <Card>
          <CardContent>
            <ClaimForm />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
