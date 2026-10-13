// Adds muted-autoplay parameters for players that support them (YouTube, Vimeo).
// Other providers (Instagram, Wikimedia Commons) are returned unchanged: click to play.
export function autoplaySrc(src: string): string {
  const url = new URL(src)
  if (url.hostname === "www.youtube-nocookie.com") {
    url.searchParams.set("autoplay", "1")
    url.searchParams.set("mute", "1")
    url.searchParams.set("playsinline", "1")
  } else if (url.hostname === "player.vimeo.com") {
    url.searchParams.set("autoplay", "1")
    url.searchParams.set("muted", "1")
  }
  return url.toString()
}
