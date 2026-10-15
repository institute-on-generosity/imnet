import { describe, expect, it } from "vitest"
import { communityIconSrc } from "./community-icon"

describe("F-103: community icon URLs", () => {
  it("builds a storage URL only for icons in a community's own folder", () => {
    expect(communityIconSrc("communities/00000000-0000-4000-e000-000000000001/icon.png", "http://x")).toBe("http://x/storage/v1/object/public/post-images/communities/00000000-0000-4000-e000-000000000001/icon.png")
    expect(communityIconSrc("https://evil.example/icon.png", "http://x")).toBeNull()
    expect(communityIconSrc("communities/../../secret.png", "http://x")).toBeNull()
    expect(communityIconSrc(null, "http://x")).toBeNull()
  })
})
