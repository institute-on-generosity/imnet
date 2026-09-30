import { describe, expect, it } from "vitest"
import { toEmbed } from "./embeds"

describe("toEmbed", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
    ["https://player.vimeo.com/video/76979871", "https://player.vimeo.com/video/76979871"],
    ["https://www.instagram.com/p/C1a2B3c4D5e/", "https://www.instagram.com/p/C1a2B3c4D5e/embed"],
    ["https://www.instagram.com/reel/C1a2B3c4D5e/", "https://www.instagram.com/reel/C1a2B3c4D5e/embed"],
  ])("%s", (input, src) => {
    expect(toEmbed(input)?.src).toBe(src)
  })

  it.each([
    "not a url",
    "javascript:alert(1)",
    "https://evil.example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://vimeo.com/channels/staffpicks",
  ])("rejects %s", (input) => {
    expect(toEmbed(input)).toBeNull()
  })
})
