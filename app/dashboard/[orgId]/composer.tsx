"use client"

import { useActionState } from "react"
import { createPost } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function Composer({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState(createPost.bind(null, orgId), null)
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="kind">Type</Label>
        <select id="kind" name="kind" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
          <option value="impact_story">Impact story</option>
          <option value="update">Update</option>
          <option value="ask">Ask</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="body">What happened?</Label>
        <Textarea id="body" name="body" rows={5} required placeholder="Share progress, told with dignity. Use first names only with consent." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="embed">Video link (optional)</Label>
        <Input id="embed" name="embed" placeholder="YouTube, Vimeo, or Instagram link" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="beneficiary_consent" className="mt-1" />
        <span>Anyone identifiable in this post (name, face, story) has given consent to share it publicly.</span>
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Posting..." : "Post"}</Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  )
}
