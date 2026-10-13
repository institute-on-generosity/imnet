import { describe, expect, it } from "vitest"
import { formValues } from "./form-values"

describe("formValues", () => {
  it("B-008: keeps what the user typed so a failed form can refill", () => {
    const form = new FormData()
    form.set("org_name", "Test Kitchen")
    form.set("work_email", "dana@example.com")
    form.set("$ACTION_ID_abc123", "")
    form.set("photo", new Blob(["x"]))
    expect(formValues(form)).toEqual({ org_name: "Test Kitchen", work_email: "dana@example.com" })
  })
})
