import { Trash2 } from "lucide-react"
import Link from "@/components/intent-link"
import { deleteThanks } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { PersonAvatar } from "@/components/person-avatar"

type Note = { id: string; body: string; created_at: string; author: { handle: string; display_name: string | null; avatar_url: string | null } }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Private notes from supporters. Remove any you don't want to keep.
export function ThanksCard({ orgId, notes }: { orgId: string; notes: Note[] }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">No notes yet. Supporters can send one from your profile.</p>
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-3 rounded-lg border p-3">
          <PersonAvatar name={n.author.display_name ?? n.author.handle} avatarUrl={n.author.avatar_url} size="md" className="mt-2" />
          <div className="min-w-0 flex-1">
            <p className="story whitespace-pre-line">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href={`/u/${n.author.handle}`} className="hover:underline">{n.author.display_name ?? `@${n.author.handle}`}</Link>, {day(n.created_at)}
            </p>
          </div>
          <form action={deleteThanks.bind(null, n.id, orgId)}>
            <IconTip label="Remove note">
              <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </IconTip>
          </form>
        </li>
      ))}
    </ul>
  )
}
