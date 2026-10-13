import { describe, expect, it } from "vitest"
import { autoplaySrc } from "./autoplay-src"

describe("autoplaySrc", () => {
  it("F-032: YouTube and Vimeo get muted autoplay; others are unchanged", () => {
    expect(autoplaySrc("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1",
    )
    expect(autoplaySrc("https://player.vimeo.com/video/76979871")).toBe("https://player.vimeo.com/video/76979871?autoplay=1&muted=1")
    const commons = "https://commons.wikimedia.org/wiki/File%3AX.webm?embedplayer=yes"
    expect(autoplaySrc(commons)).toBe(commons)
    expect(autoplaySrc("https://www.instagram.com/p/abc/embed")).toBe("https://www.instagram.com/p/abc/embed")
  })
})
