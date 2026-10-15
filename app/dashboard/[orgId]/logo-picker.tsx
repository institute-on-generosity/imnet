"use client"

import { ImageUp, Trash2 } from "lucide-react"
import { useState } from "react"
import { IconTip } from "@/components/icon-tip"
import { OrgMark } from "@/components/org-mark"
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/post-images"
import { createClient } from "@/lib/supabase/client"
import type { Org } from "@/lib/types"

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

// Uploads a logo to the org's folder; the form submits the path and the server sets logo_url.
export function LogoPicker({ org }: { org: Org }) {
  const [preview, setPreview] = useState<string | null>(org.logo_url)
  const [path, setPath] = useState("")
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) return setError("Use a JPG, PNG or WebP under 5 MB.")
    setBusy(true)
    const next = `${org.id}/logo-${crypto.randomUUID()}.${EXT[file.type]}`
    const { error: upErr } = await createClient().storage.from("post-images").upload(next, file, { contentType: file.type })
    setBusy(false)
    if (upErr) return setError(`Upload failed: ${upErr.message}`)
    setPath(next)
    setRemoved(false)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="flex items-center gap-3">
      <OrgMark org={{ ...org, logo_url: removed ? null : preview }} size="lg" />
      <input type="hidden" name="logo_path" value={path} />
      {removed && <input type="hidden" name="remove_logo" value="on" />}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-[11px] text-sm hover:bg-muted">
        <ImageUp className="size-4" aria-hidden />
        {busy ? "Uploading..." : preview && !removed ? "Change logo" : "Upload logo"}
        <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
      </label>
      {preview && !removed && (
        <IconTip label="Remove logo">
          <button type="button" onClick={() => { setRemoved(true); setPath("") }} className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </IconTip>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
