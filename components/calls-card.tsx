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
      <div role="tablist" aria-label="Kind of help" className="mt-3 grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs font-medium">
        {(["volunteer", "donate"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-md py-1.5 transition-colors", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t === "volunteer" ? "Volunteer" : "Donate"}
          </button>
        ))}
      </div>
      <ul role="tabpanel" aria-label={tab === "volunteer" ? "Calls for volunteers" : "Calls for donations"} className="mt-2 divide-y">
        {calls.length === 0 && <li className="py-3 text-sm text-muted-foreground">No open calls right now.</li>}
        {/* Org first (who's asking), then the ask, then when / how much beside the button. */}
        {calls.map((c) => (
          <li key={c.id} className="group relative flex gap-3 py-3">
            {c.org && <span className="shrink-0"><OrgMark org={c.org} size="sm" /></span>}
            <div className="min-w-0 flex-1">
              {c.org && <p className="truncate text-sm leading-6 font-semibold">{c.org.name}</p>}
              <Link href={`/p/${c.id}`} className="line-clamp-2 text-[13px] leading-snug text-muted-foreground group-hover:text-foreground after:absolute after:inset-0">{c.body}</Link>
              <div className="mt-2 flex items-center gap-2">
                <p className="flex min-w-0 flex-1 flex-wrap gap-x-2 text-xs text-muted-foreground">
                  {c.action_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{tab === "donate" ? "By " : ""}{day(c.action_date)}</span>}
                  {c.goal_usd && <span className="inline-flex items-center gap-1"><Target className="size-3.5" aria-hidden />{formatUsd(c.goal_usd)} goal</span>}
                </p>
                <a href={c.action_url!} target="_blank" rel="noopener noreferrer"
                  className={cn("relative shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white", tab === "volunteer" ? "bg-leaf hover:bg-leaf/90" : "bg-amber-600 hover:bg-amber-700")}>
                  {tab === "volunteer" ? "Sign up" : "Donate"}<span className="sr-only"> for {c.org?.name}</span>
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link href={all} className="mt-1 block border-t pt-3 text-sm font-semibold text-leaf hover:underline">See all {tab === "volunteer" ? "volunteer calls" : "donation calls"}</Link>
    </Panel>
  )
}
