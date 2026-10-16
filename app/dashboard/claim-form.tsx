"use client"

import { BadgeCheck, FileSearch } from "lucide-react"
import { useActionState, useRef, useState, useTransition } from "react"
import { lookupEin, submitClaim, type EinLookup } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ClaimForm() {
  const [state, action, pending] = useActionState(submitClaim, null)
  const v = state?.values
  // F-109: look the EIN up in IRS records as soon as it's typed.
  const [irs, setIrs] = useState<{ ein: string; found: EinLookup } | null>(null)
  const [looking, look] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)
  const check = (raw: string) => {
    const ein = raw.replace(/\D/g, "")
    if (ein.length !== 9 || ein === irs?.ein) return
    look(async () => setIrs({ ein, found: await lookupEin(ein) }))
  }
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
      <Field label="EIN" name="ein" defaultValue={v?.ein} placeholder="12-3456789" onBlur={(e) => check(e.currentTarget.value)} onChange={(e) => check(e.currentTarget.value)} />
      {looking && <p className="text-sm text-muted-foreground">Checking IRS records...</p>}
      {!looking && irs && (irs.found ? (
        <div role="status" className="flex gap-3 rounded-lg border border-leaf/30 bg-leaf-soft/60 p-3 text-sm">
          <FileSearch className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{irs.found.name}</p>
            <p className="text-muted-foreground">{[irs.found.city && irs.found.state ? `${irs.found.city}, ${irs.found.state}` : null, irs.found.taxExempt && `${irs.found.taxExempt}${irs.found.since ? ` since ${irs.found.since}` : ""}`, irs.found.foundation ? "files as a foundation" : null].filter(Boolean).join(" · ")}</p>
            <p className="text-xs text-faint">Found in IRS records</p>
          </div>
          <button type="button" onClick={() => { if (nameRef.current) nameRef.current.value = irs.found!.name }} className="h-fit shrink-0 text-sm font-semibold text-leaf hover:underline">Use this name</button>
        </div>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">No IRS record for this EIN yet. You can still submit; we&apos;ll check it by hand.</p>
      ))}
      <Field label="Organization name" name="org_name" defaultValue={v?.org_name} ref={nameRef} />
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
