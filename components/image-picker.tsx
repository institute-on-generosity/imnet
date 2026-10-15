"use client"

import { ImagePlus, X } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES } from "@/lib/post-images"
import { createClient } from "@/lib/supabase/client"

type Picked = { path: string; preview: string; alt: string }
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

// Uploads photos as soon as they're picked; the form submits the paths. folder: the org's id, or
// "people/<user id>" for donor posts.
export function ImagePicker({ folder }: { folder: string }) {
  const [images, setImages] = useState<Picked[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(files: FileList | null) {
    if (!files) return
    setError(null)
    const room = MAX_IMAGES - images.length
    const chosen = [...files].slice(0, room)
    if (files.length > room) setError(`Add up to ${MAX_IMAGES} photos.`)
    const bad = chosen.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES)
    if (bad) return setError(`${bad.name}: use a JPG, PNG or WebP under 5 MB.`)

    setBusy(true)
    const supabase = createClient()
    for (const file of chosen) {
      const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`
      const { error: upErr } = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type })
      if (upErr) {
        setError(`${file.name} didn't upload: ${upErr.message}`)
        break
      }
      setImages((prev) => [...prev, { path, preview: URL.createObjectURL(file), alt: "" }])
    }
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      {images.map((img, i) => (
        <div key={img.path} className="flex items-start gap-3 rounded-lg border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.preview} alt="" className="size-16 shrink-0 rounded-md object-cover" />
          <div className="flex-1 space-y-1">
            <input type="hidden" name="image_paths" value={img.path} />
            <Input
              name="image_alts"
              required
              maxLength={300}
              placeholder="Describe this photo (for screen readers)"
              aria-label={`Description for photo ${i + 1}`}
              value={img.alt}
              onChange={(e) => setImages((prev) => prev.map((p, j) => (j === i ? { ...p, alt: e.target.value } : p)))}
            />
          </div>
          <button
            type="button"
            aria-label={`Remove photo ${i + 1}`}
            onClick={() => {
              setImages((prev) => prev.filter((_, j) => j !== i))
              // Removed before posting: delete the upload now rather than leaving it for cleanup.
              void createClient().storage.from("post-images").remove([img.path])
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {images.length < MAX_IMAGES && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-[11px] text-sm hover:bg-muted">
          <ImagePlus className="size-4" aria-hidden />
          {busy ? "Uploading..." : images.length ? "Add another photo" : "Add photos"}
          <input
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ""
            }}
          />
        </label>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
