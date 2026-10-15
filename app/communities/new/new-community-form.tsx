"use client"

import { Users } from "lucide-react"
import { useActionState } from "react"
import { createGroup } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Cause } from "@/lib/types"

export function NewCommunityForm({ causes }: { causes: Cause[] }) {
  const [state, action, pending] = useActionState(createGroup, null)
  return (
    <form action={action} className="mt-5 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required minLength={3} maxLength={80} placeholder="Portland weekend food volunteers" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">What it&apos;s for</Label>
        <Textarea id="description" name="description" rows={3} maxLength={500} placeholder="Who should join and what you'll talk about" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cause">Cause</Label>
        <select id="cause" name="cause" defaultValue="" className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm">
          <option value="">No specific cause</option>
          {causes.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}><Users aria-hidden />{pending ? "Creating..." : "Start community"}</Button>
    </form>
  )
}
