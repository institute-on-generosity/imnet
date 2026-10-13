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
    [
      "https://commons.wikimedia.org/wiki/File:San_Antonio,_TX,_Food_Bank_(20111031-FNS-LSC-9001).webm",
      "https://commons.wikimedia.org/wiki/File%3ASan_Antonio%2C_TX%2C_Food_Bank_(20111031-FNS-LSC-9001).webm?embedplayer=yes",
    ],
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
    "https://commons.wikimedia.org/wiki/File:Some_photo.jpg",
    "https://commons.wikimedia.org/wiki/Special:Random",
    "https://commons.wikimedia.org.evil.com/wiki/File:x.webm",
  ])("rejects %s", (input) => {
    expect(toEmbed(input)).toBeNull()
  })
})
