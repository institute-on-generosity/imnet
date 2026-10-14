import { createAvatar } from "@dicebear/core"
import { notionists } from "@dicebear/collection"
import { AVATAR_SEED } from "@/lib/avatar"

const BACKGROUNDS = ["e6f2ec", "fdf3d1", "e8eef7", "f3e8f5", "fde8e1", "e0f2f1"]

// GET /avatars/<seed>: an illustrated person, the same for the same seed. The seed only
// drives the drawing, so the SVG never contains user input.
export async function GET(_: Request, { params }: { params: Promise<{ seed: string }> }) {
  const { seed } = await params
  if (!AVATAR_SEED.test(seed)) return new Response("Not found", { status: 404 })
  const svg = createAvatar(notionists, { seed, backgroundColor: BACKGROUNDS, gestureProbability: 0, bodyIconProbability: 0 }).toString()
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      "x-content-type-options": "nosniff",
    },
  })
}
