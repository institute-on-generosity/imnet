"use client"

import { useActionState } from "react"
import { createPost } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatUsd } from "@/lib/grants"
import type { Grant, OrgType } from "@/lib/types"
import { GranteePicker } from "./grantee-picker"
import { ImagePicker } from "./image-picker"

type ComposerProps = { orgId: string; orgType?: OrgType; reportableGrants?: Grant[]; reportOn?: string }

export function Composer({ orgId, orgType = "nonprofit", reportableGrants = [], reportOn }: ComposerProps) {
  const [state, action, pending] = useActionState(createPost.bind(null, orgId), null)
  const v = state?.values
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="kind">Type</Label>
        <select id="kind" name="kind" defaultValue={v?.kind ?? "impact_story"} key={v?.kind} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
          <option value="impact_story">Impact story</option>
          <option value="update">Update</option>
          <option value="ask">Ask</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="body">What happened?</Label>
        <Textarea id="body" name="body" rows={5} required defaultValue={v?.body} placeholder="Share progress, told with dignity. Use first names only with consent." />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Photos (optional, up to 4)</span>
        <ImagePicker key={state?.id ?? "new"} orgId={orgId} />
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
      <Button type="submit" disabled={pending}>{pending ? "Posting..." : "Post"}</Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  )
}
