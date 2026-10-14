"use client"

import { Menu } from "@base-ui/react/menu"
import { Ellipsis, Flag, Link2 } from "lucide-react"
import { useState } from "react"
import { reportPost } from "@/app/actions"

const ITEM = "flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"

// LinkedIn's "⋯" menu on a post: copy the link, or report it for review.
export function PostMenu({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const [note, setNote] = useState<string | null>(null)
  const flash = (text: string) => {
    setNote(text)
    setTimeout(() => setNote(null), 2500)
  }
  return (
    <div className="relative">
      <Menu.Root>
        <Menu.Trigger aria-label="More actions" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <Ellipsis className="size-5" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
              <Menu.Item className={ITEM} onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/p/${postId}`); flash("Link copied") }}>
                <Link2 className="size-4" aria-hidden />Copy link to post
              </Menu.Item>
              {signedIn && (
                <Menu.Item className={ITEM} onClick={async () => { await reportPost(postId, "Reported from the post menu"); flash("Reported. We'll review it.") }}>
                  <Flag className="size-4" aria-hidden />Report post
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {note && <p role="status" className="absolute top-9 right-0 z-10 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background">{note}</p>}
    </div>
  )
}
