// Client side of /api/signals. keepalive lets the request finish after the page unloads.
export async function sendSignal(signal: { kind: "follow" | "supporter" | "moved" | "saved"; id: string; on: boolean }) {
  const res = await fetch("/api/signals", {
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(signal),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save")
}
