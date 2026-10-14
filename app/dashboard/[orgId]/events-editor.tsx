"use client"

import { Plus, Trash2 } from "lucide-react"
import { useActionState, useSyncExternalStore } from "react"
import { addEvent, deleteEvent } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { LocalTime } from "@/components/local-time"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OrgEvent } from "@/lib/events"

const noop = () => () => {}

type Person = { handle: string; display_name: string | null }

// Staff add events and see who's coming (RSVPs are private to the team).
export function EventsEditor({ orgId, events }: { orgId: string; events: (OrgEvent & { people: Person[] })[] }) {
  const [state, action, pending] = useActionState(addEvent.bind(null, orgId), null)
  // The browser's UTC offset (empty during server render), so times mean what staff typed.
  const tz = useSyncExternalStore(noop, () => String(new Date().getTimezoneOffset()), () => "")
  const v = state?.values
  return (
    <div className="space-y-4">
      {events.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.title}</p>
                <p className="text-muted-foreground"><LocalTime iso={e.starts_at} />, {e.location}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-leaf">{e.people.length} going</summary>
                  {e.people.length > 0 && <p className="mt-1 text-muted-foreground">{e.people.map((p) => p.display_name ?? `@${p.handle}`).join(", ")}</p>}
                </details>
              </div>
              <form action={deleteEvent.bind(null, e.id)}>
                <IconTip label={`Remove "${e.title}"`}>
                  <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>
                </IconTip>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form key={state?.id ?? "new"} action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="tz_offset" value={tz} />
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="event-title">Event</Label>
          <Input id="event-title" name="title" required maxLength={120} placeholder="Saturday planting day" defaultValue={v?.title} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-start">Starts</Label>
          <Input id="event-start" name="starts_local" type="datetime-local" required defaultValue={v?.starts_local} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-location">Where</Label>
          <Input id="event-location" name="location" required maxLength={200} placeholder="12 Pier St, or Online" defaultValue={v?.location} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="event-detail">Details (optional)</Label>
          <Textarea id="event-detail" name="detail" rows={2} maxLength={1000} placeholder="What to bring, who it's for." defaultValue={v?.detail} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending || !tz}><Plus aria-hidden />{pending ? "Adding..." : "Add event"}</Button>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>
    </div>
  )
}
