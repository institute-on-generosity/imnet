"use client"

import { Megaphone, Send, X } from "lucide-react"
import { useActionState, useState } from "react"
import { createDonorPost } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { ImagePicker } from "./image-picker"
import { PersonAvatar } from "./person-avatar"
import { Panel } from "./shell"

type Viewer = { id: string; name: string; avatarUrl: string | null }

// LinkedIn's "Start a post", for people (F-079): spread the word about a cause or an
// organization. Text, up to 4 photos (with descriptions and consent), and an optional spotlight on
// a nonprofit or foundation you follow.
export function DonorComposer({ viewer, orgs }: { viewer: Viewer; orgs: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  // Close the editor once a post goes through (each new post has a new id).
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createDonorPost>>, form: FormData) => {
    const next = await createDonorPost(prev, form)
    if (next?.ok) setOpen(false)
    return next
  }, null)
  return (
    <Panel className="p-3 sm:p-4">
      {!open ? (
        <div className="flex items-center gap-3">
          <PersonAvatar name={viewer.name} avatarUrl={viewer.avatarUrl} size="lg" />
          <button type="button" onClick={() => setOpen(true)} className="h-12 flex-1 rounded-full border px-4 text-left text-sm font-medium text-muted-foreground hover:bg-muted">
            Start a post
          </button>
        </div>
      ) : (
        <form key={state?.id ?? "new"} action={action} className="space-y-3">
          <div className="flex items-center gap-3">
            <PersonAvatar name={viewer.name} avatarUrl={viewer.avatarUrl} size="lg" />
            <p className="flex-1 font-semibold">{viewer.name}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden /></button>
          </div>
          <label htmlFor="donor-post" className="sr-only">What do you want to share?</label>
          <textarea id="donor-post" name="body" required maxLength={3000} rows={4} autoFocus defaultValue={state?.values?.body}
            placeholder="Spread the word: a cause you care about, why you give, a need someone could help with"
            className="field-sizing-content min-h-24 w-full resize-none bg-transparent text-[1.0625rem] outline-none placeholder:text-muted-foreground" />
          <ImagePicker key={state?.id ?? "photos"} folder={`people/${viewer.id}`} />
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="beneficiary_consent" className="mt-1" defaultChecked={state?.values?.beneficiary_consent === "on"} />
            <span>Anyone identifiable in my photos has agreed to be shown, and no one is shown while receiving help</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="ai_assisted" className="mt-1" defaultChecked={state?.values?.ai_assisted === "on"} />
            <span>My photos were made or changed with AI (shows an &ldquo;AI-assisted&rdquo; label)</span>
          </label>
          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <label className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <Megaphone className="size-4 shrink-0" aria-hidden />
              <span className="shrink-0">Spotlight</span>
              <select name="about_org_id" defaultValue={state?.values?.about_org_id ?? ""} aria-label="Spotlight an organization"
                className="h-8 min-w-0 max-w-56 rounded-lg border bg-background px-2 text-sm text-foreground">
                <option value="">No organization</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-3">
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending}><Send aria-hidden />{pending ? "Posting..." : "Post"}</Button>
            </div>
          </div>
        </form>
      )}
      {state?.ok && !open && <p role="status" className="mt-2 text-sm text-leaf">Posted. It&apos;s at the top of your feed.</p>}
    </Panel>
  )
}
