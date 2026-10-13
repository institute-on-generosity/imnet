"use client"

import { useActionState } from "react"
import { submitClaim } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ClaimForm() {
  const [state, action, pending] = useActionState(submitClaim, null)
  const v = state?.values
  return (
    <form action={action} className="space-y-3">
      <Field label="Organization name" name="org_name" defaultValue={v?.org_name} />
      <Field label="EIN" name="ein" defaultValue={v?.ein} placeholder="12-3456789" />
      <Field label="Website" name="website" defaultValue={v?.website} type="url" placeholder="https://example.org" />
      <Field label="Your work email (on the org's domain)" name="work_email" defaultValue={v?.work_email} type="email" />
      <div className="space-y-1">
        <Label htmlFor="note">Anything we should know? (optional)</Label>
        <Textarea id="note" name="note" defaultValue={v?.note} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Submitting..." : "Submit claim"}</Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  )
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  )
}
