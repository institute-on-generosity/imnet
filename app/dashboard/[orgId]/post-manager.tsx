"use client"

import { Check, Pencil, Trash2, X } from "lucide-react"
import Link from "@/components/intent-link"
import { useActionState, useState } from "react"
import { deletePost, updatePostBody } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { POST_KIND_LABEL, type PostKind } from "@/lib/types"

type StaffPost = { id: string; kind: PostKind; body: string; created_at: string; edited_at: string | null }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export function PostManager({ posts }: { posts: StaffPost[] }) {
  if (posts.length === 0) return <p className="text-sm text-muted-foreground">No posts yet</p>
  return (
    <ul className="divide-y rounded-lg border">
      {posts.map((p) => <PostRow key={p.id} post={p} />)}
    </ul>
  )
}

function PostRow({ post }: { post: StaffPost }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof updatePostBody>>, form: FormData) => {
    const result = await updatePostBody(post.id, prev, form)
    if (result?.ok) setEditing(false)
    return result
  }, null)

  if (editing) {
    return (
      <li className="space-y-2 p-3">
        <form action={action} className="space-y-2">
          <Textarea name="body" rows={4} defaultValue={state?.values?.body ?? post.body} aria-label="Post text" required />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}><Check aria-hidden />Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}><X aria-hidden />Cancel</Button>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="w-12 shrink-0 text-muted-foreground">{day(post.created_at)}</span>
      <Link href={`/p/${post.id}`} className="min-w-0 flex-1 truncate hover:underline">
        <span className="text-muted-foreground">{POST_KIND_LABEL[post.kind]}: </span>
        {post.body}
      </Link>
      <IconTip label="Edit text">
        <button type="button" onClick={() => setEditing(true)} className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <Pencil className="size-4" aria-hidden />
        </button>
      </IconTip>
      <form action={deletePost.bind(null, post.id)} onSubmit={(e) => { if (!confirm("Delete this post? This can't be undone.")) e.preventDefault() }}>
        <IconTip label="Delete post">
          <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </IconTip>
      </form>
    </li>
  )
}
