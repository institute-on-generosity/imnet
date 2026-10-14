import { eventIcs } from "@/lib/events"
import { getEvent } from "@/lib/queries"

// GET /e/<id>/calendar.ics: add the event to any calendar app.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) return new Response("Not found", { status: 404 })
  const url = new URL(`/e/${event.id}`, request.url).toString()
  return new Response(eventIcs(event, event.org.name, url), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event.title.replace(/[^\w -]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "event"}.ics"`,
    },
  })
}
