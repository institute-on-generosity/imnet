"use client"

import { BadgeCheck } from "lucide-react"
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
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">This organization is a</legend>
        <div className="flex gap-4 text-sm">
          {[
            ["nonprofit", "Nonprofit (does the work)"],
            ["foundation", "Foundation (funds the work)"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5">
              <input type="radio" name="org_type" value={value} required defaultChecked={(v?.org_type ?? "nonprofit") === value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Organization name" name="org_name" defaultValue={v?.org_name} />
      <Field label="EIN" name="ein" defaultValue={v?.ein} placeholder="12-3456789" />
      <Field label="Website" name="website" defaultValue={v?.website} type="url" placeholder="https://example.org" />
      <Field label="Your work email (on the org's domain)" name="work_email" defaultValue={v?.work_email} type="email" />
      <div className="space-y-1">
        <Label htmlFor="note">Anything we should know? (optional)</Label>
        <Textarea id="note" name="note" defaultValue={v?.note} />
      </div>
      <Button type="submit" disabled={pending}><BadgeCheck aria-hidden />{pending ? "Submitting..." : "Submit claim"}</Button>
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
