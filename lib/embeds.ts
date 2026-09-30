// Turns a pasted YouTube / Vimeo / Instagram link into a safe iframe src.
// Returns null for anything else, so arbitrary URLs never reach an iframe.

export type Embed = { provider: "youtube" | "vimeo" | "instagram"; src: string }

const YT_ID = /^[\w-]{11}$/

export function toEmbed(raw: string): Embed | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  const host = url.hostname.replace(/^www\.|^m\./, "")
  const parts = url.pathname.split("/").filter(Boolean)

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      url.searchParams.get("v") ??
      (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : undefined)
    return id && YT_ID.test(id)
      ? { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null
  }
  if (host === "youtu.be") {
    const id = parts[0]
    return id && YT_ID.test(id)
      ? { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d+$/.test(p))
    return id ? { provider: "vimeo", src: `https://player.vimeo.com/video/${id}` } : null
  }
  if (host === "instagram.com") {
    const i = parts.findIndex((p) => ["p", "reel", "tv"].includes(p))
    const code = i >= 0 ? parts[i + 1] : undefined
    return code && /^[\w-]+$/.test(code)
      ? { provider: "instagram", src: `https://www.instagram.com/${parts[i]}/${code}/embed` }
      : null
  }
  return null
}
