import { describe, expect, it } from "vitest"
import { buttonVariants } from "./button"

describe("buttonVariants", () => {
  it("B-007: outline buttons keep their border when used outside <Button>", () => {
    const classes = buttonVariants({ variant: "outline" }).split(" ")
    expect(classes).toContain("border-border")
    expect(classes).not.toContain("border-transparent")
  })
})
