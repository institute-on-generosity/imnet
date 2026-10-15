"use client"

import { ImageUp, Trash2 } from "lucide-react"
import { useState } from "react"
import { IconTip } from "@/components/icon-tip"
import { orgCoverSrc } from "@/lib/cover"
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/post-images"
import { createClient } from "@/lib/supabase/client"
import type { Org } from "@/lib/types"

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

// Cover photo: uploads to the org's folder; the form submits the path and the server sets cover_url.
// Wide images work best (about 4:1, like 1584 x 396). Show places and your work, not the people you serve.
export function CoverPicker({ org }: { org: Org }) {
  const [preview, setPreview] = useState<string | null>(orgCoverSrc(org.cover_url))
  const [path, setPath] = useState("")
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) return setError("Use a JPG, PNG or WebP under 5 MB.")
    setBusy(true)
    const next = `${org.id}/cover-${crypto.randomUUID()}.${EXT[file.type]}`
    const { error: upErr } = await createClient().storage.from("post-images").upload(next, file, { contentType: file.type })
    setBusy(false)
    if (upErr) return setError(`Upload failed: ${upErr.message}`)
    setPath(next)
    setRemoved(false)
    setPreview(URL.createObjectURL(file))
  }

  const shown = removed ? null : preview
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Cover photo</p>
      <div className="relative aspect-[4/1] overflow-hidden rounded-lg border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shown ? <img src={shown} alt="" className="size-full object-cover" /> : <p className="grid size-full place-items-center text-sm text-muted-foreground">No cover yet</p>}
      </div>
      <input type="hidden" name="cover_path" value={path} />
      {removed && <input type="hidden" name="remove_cover" value="on" />}
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-[11px] text-sm hover:bg-muted">
          <ImageUp className="size-4" aria-hidden />
          {busy ? "Uploading..." : shown ? "Change cover" : "Upload cover"}
          <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {shown && (
          <IconTip label="Remove cover">
            <button type="button" onClick={() => { setRemoved(true); setPath("") }} className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </IconTip>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Wide photos work best (about 4:1). Show places and your work, not the people you serve.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
