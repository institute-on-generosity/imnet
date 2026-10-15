"use client"

import { Send } from "lucide-react"
import { useActionState, useState } from "react"
import { createPost } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatUsd } from "@/lib/grants"
import type { Cause, Grant, OrgType, PostKind } from "@/lib/types"
import { GranteePicker } from "./grantee-picker"
import { ImagePicker } from "@/components/image-picker"

type ComposerProps = { orgId: string; orgType?: OrgType; reportableGrants?: Grant[]; reportOn?: string; causes?: Cause[] }

export function Composer({ orgId, orgType = "nonprofit", reportableGrants = [], reportOn, causes = [] }: ComposerProps) {
  const [state, action, pending] = useActionState(createPost.bind(null, orgId), null)
  const v = state?.values
  const [kind, setKind] = useState<PostKind>((v?.kind as PostKind) ?? "impact_story")
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="kind">Type</Label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as PostKind)} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
          <option value="impact_story">Impact story</option>
          <option value="update">Update</option>
          <option value="ask">Ask</option>
          <option value="call_volunteers">Call for volunteers</option>
          <option value="call_donations">Call for donations</option>
          {orgType === "foundation" && <option value="open_call">Open call (invite applications)</option>}
        </select>
      </div>
      {kind === "open_call" && <OpenCallFields causes={causes} v={v} />}
      {(kind === "call_volunteers" || kind === "call_donations") && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="action_url">{kind === "call_volunteers" ? "Sign-up link" : "Donate link"}</Label>
            <Input id="action_url" name="action_url" type="url" required placeholder="https://your-org.org/..." defaultValue={v?.action_url} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="action_date">{kind === "call_volunteers" ? "When (optional)" : "Give by (optional)"}</Label>
            <Input id="action_date" name="action_date" type="date" defaultValue={v?.action_date} />
          </div>
          {kind === "call_donations" && (
            <div className="space-y-1">
              <Label htmlFor="goal_usd">Goal in $ (optional)</Label>
              <Input id="goal_usd" name="goal_usd" inputMode="numeric" placeholder="5,000" defaultValue={v?.goal_usd} />
            </div>
          )}
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="body">What happened?</Label>
        <Textarea id="body" name="body" rows={5} required defaultValue={v?.body} placeholder="Share progress, told with dignity. Use first names only with consent." />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Photos (optional, up to 4)</span>
        <ImagePicker key={state?.id ?? "new"} folder={orgId} />
      </div>
      {reportableGrants.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="reports_grant_id">This post reports on a grant (optional)</Label>
          <select
            id="reports_grant_id"
            name="reports_grant_id"
            key={`${state?.id ?? "new"}-${reportOn ?? ""}`}
            defaultValue={v?.reports_grant_id ?? reportOn ?? ""}
            className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value="">Not a grant report</option>
            {reportableGrants.map((g) => (
              <option key={g.id} value={g.id}>
                {g.foundation.name}
                {g.amount_usd ? `, ${formatUsd(g.amount_usd)}` : ""}
                {g.purpose ? ` for ${g.purpose}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {orgType === "foundation" && (
        <div className="space-y-1">
          <span className="text-sm font-medium">Grantees (optional)</span>
          <GranteePicker key={state?.id ?? "new"} />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="embed">Video link (optional)</Label>
        <Input id="embed" name="embed" defaultValue={v?.embed} placeholder="YouTube, Vimeo, Instagram or Wikimedia Commons link" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="beneficiary_consent" className="mt-1" defaultChecked={v?.beneficiary_consent === "on"} />
        <span>Anyone identifiable in this post (name, face, story) has given consent to share it publicly.</span>
      </label>
      <Button type="submit" disabled={pending}><Send aria-hidden />{pending ? "Posting..." : "Post"}</Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  )
}

// Apply-by date, link to the application, optional max award, eligible causes.
function OpenCallFields({ causes, v }: { causes: Cause[]; v?: Record<string, string> }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <legend className="px-1 text-sm font-medium">Open call details</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="call_deadline">Apply by</Label>
          <Input id="call_deadline" name="call_deadline" type="date" required min={new Date().toISOString().slice(0, 10)} defaultValue={v?.call_deadline} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="call_max_award">Maximum award (optional)</Label>
          <Input id="call_max_award" name="call_max_award" inputMode="numeric" placeholder="e.g. 25000" defaultValue={v?.call_max_award} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="call_apply_url">Application link</Label>
        <Input id="call_apply_url" name="call_apply_url" type="url" required placeholder="https://your-foundation.org/apply" defaultValue={v?.call_apply_url} />
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm">Eligible causes (none checked = open to all)</legend>
        <div className="flex flex-wrap gap-3">
          {causes.map((c) => (
            <label key={c.slug} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="call_causes" value={c.slug} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
    </fieldset>
  )
}

