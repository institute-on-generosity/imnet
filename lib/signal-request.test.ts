import { describe, expect, it } from "vitest"
import { parseSignalRequest } from "./signal-request"

const URL_ = "http://localhost:3100/api/signals"
const h = (o: Record<string, string>) => new Headers(o)
const ok = { "content-type": "application/json", origin: "http://localhost:3100" }
const body = { kind: "follow", id: "00000000-0000-4000-a000-000000000001", on: true }

describe("parseSignalRequest", () => {
  it("B-013: accepts same-origin JSON signals", () => {
    expect(parseSignalRequest(h(ok), URL_, body)).toEqual({ signal: body })
  })

  it("B-013: rejects cross-site, missing origin, non-JSON and malformed signals", () => {
    expect(parseSignalRequest(h({ ...ok, origin: "https://evil.example" }), URL_, body)).toMatchObject({ status: 403 })
    expect(parseSignalRequest(h({ "content-type": "application/json" }), URL_, body)).toMatchObject({ status: 403 })
    expect(parseSignalRequest(h({ ...ok, "content-type": "text/plain" }), URL_, body)).toMatchObject({ status: 415 })
    expect(parseSignalRequest(h(ok), URL_, { ...body, kind: "delete_everything" })).toMatchObject({ status: 400 })
    expect(parseSignalRequest(h(ok), URL_, { ...body, id: "harbor-table" })).toMatchObject({ status: 400 })
    expect(parseSignalRequest(h(ok), URL_, { ...body, on: "yes" })).toMatchObject({ status: 400 })
  })

  it("F-058 / F-059: accepts RSVP and volunteer-interest signals", () => {
    expect(parseSignalRequest(h(ok), URL_, { ...body, kind: "rsvp" })).toMatchObject({ signal: { kind: "rsvp" } })
    expect(parseSignalRequest(h(ok), URL_, { ...body, kind: "interest" })).toMatchObject({ signal: { kind: "interest" } })
  })

  it("B-030: accepts any well-formed id, including demo people's ids", () => {
    expect(parseSignalRequest(h(ok), URL_, { ...body, kind: "follow_person", id: "00000000-0000-4000-c000-000000000005" })).toMatchObject({ signal: { kind: "follow_person" } })
  })
})
