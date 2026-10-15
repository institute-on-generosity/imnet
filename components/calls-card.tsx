"use client"

import { CalendarDays, Target } from "lucide-react"
import { useState } from "react"
import Link from "@/components/intent-link"
import { formatUsd } from "@/lib/grants"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"

type Call = Pick<Post, "id" | "body" | "action_url" | "action_date" | "goal_usd" | "org">
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Home sidebar (F-085): the newest calls for volunteers or donations, with a toggle between them.
export function CallsCard({ volunteer, donate, cause }: { volunteer: Call[]; donate: Call[]; cause?: string }) {
  const [tab, setTab] = useState<"volunteer" | "donate">(volunteer.length || !donate.length ? "volunteer" : "donate")
  if (volunteer.length === 0 && donate.length === 0) return null
  const calls = tab === "volunteer" ? volunteer : donate
  const all = `/needs?show=${tab}${cause ? `&cause=${cause}` : ""}`
  return (
    <Panel aria-labelledby="calls-card" className="p-4">
      <h2 id="calls-card" className="font-sans text-base font-semibold tracking-normal">Calls to help</h2>
      <div role="tablist" aria-label="Kind of help" className="mt-2 grid grid-cols-2 rounded-full bg-muted p-1 text-sm">
        {(["volunteer", "donate"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-full py-1 transition-colors", tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t === "volunteer" ? "Volunteer" : "Donate"}
          </button>
        ))}
      </div>
      <ul role="tabpanel" aria-label={tab === "volunteer" ? "Calls for volunteers" : "Calls for donations"} className="mt-1 divide-y">
        {calls.length === 0 && <li className="py-3 text-sm text-muted-foreground">No open calls right now.</li>}
        {calls.map((c) => (
          <li key={c.id} className="group relative flex gap-3 py-3">
            {c.org && <span className="mt-[3px] shrink-0"><OrgMark org={c.org} size="md" /></span>}
            <div className="min-w-0 flex-1">
              <Link href={`/p/${c.id}`} className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline after:absolute after:inset-0">{c.body}</Link>
              {c.org && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.org.name}</p>}
              <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {c.action_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden />{tab === "donate" ? "By " : ""}{day(c.action_date)}</span>}
                {c.goal_usd && <span className="inline-flex items-center gap-1"><Target className="size-3" aria-hidden />Goal {formatUsd(c.goal_usd)}</span>}
              </p>
              <a href={c.action_url!} target="_blank" rel="noopener noreferrer"
                className={cn("relative mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", tab === "volunteer" ? "text-leaf hover:bg-leaf-soft" : "text-amber-700 hover:bg-marigold-soft")}>
                {tab === "volunteer" ? "Sign up" : "Donate"}<span className="sr-only"> for {c.org?.name}</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
      <Link href={all} className="mt-2 block text-sm font-semibold text-leaf hover:underline">See all {tab === "volunteer" ? "volunteer calls" : "donation calls"}</Link>
    </Panel>
  )
}
