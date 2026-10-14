"use client"

import { Send } from "lucide-react"
import { useActionState } from "react"
import { addComment } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// orgName: set for the posting org's staff, who can reply as the org.
export function CommentForm({ postId, orgName }: { postId: string; orgName?: string }) {
  const [state, action, pending] = useActionState(addComment.bind(null, postId), null)
  return (
    <form key={state?.id ?? "new"} action={action} className="space-y-2">
      <label htmlFor="comment-body" className="sr-only">Add a comment</label>
      <Textarea id="comment-body" name="body" rows={2} maxLength={1000} required placeholder="Add a comment. Be kind; people in these stories may read it." defaultValue={state?.values?.body} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}><Send aria-hidden />{pending ? "Posting..." : "Comment"}</Button>
        {orgName && (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" name="as_org" defaultChecked={state?.values?.as_org === "on"} className="size-4 accent-[var(--leaf)]" />
            Reply as {orgName}
          </label>
        )}
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}
