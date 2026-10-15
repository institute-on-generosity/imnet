"use client"

import { useState } from "react"
import Link from "@/components/intent-link"
import { formatUsd } from "@/lib/grants"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DonateDialog } from "./donate-dialog"
import { OrgMark } from "./org-mark"
import { Panel } from "./shell"

type Call = Pick<Post, "id" | "body" | "action_url" | "action_date" | "goal_usd" | "org">
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Home sidebar (F-085): the newest calls for volunteers or donations, with a toggle between them.
export function CallsCard({ volunteer, donate, cause, signedIn = false }: { volunteer: Call[]; donate: Call[]; cause?: string; signedIn?: boolean }) {
  const [tab, setTab] = useState<"volunteer" | "donate">(volunteer.length || !donate.length ? "volunteer" : "donate")
  if (volunteer.length === 0 && donate.length === 0) return null
  const calls = tab === "volunteer" ? volunteer : donate
  const all = `/needs?show=${tab}${cause ? `&cause=${cause}` : ""}`
  return (
    <Panel aria-labelledby="calls-card" className="p-4">
      <h2 id="calls-card" className="h-rail">Calls to help</h2>
      <div role="tablist" aria-label="Kind of help" className="mt-2.5 grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs font-medium">
        {(["volunteer", "donate"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-md py-1.5 transition-colors", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t === "volunteer" ? "Volunteer" : "Donate"}
          </button>
        ))}
      </div>
      <ul role="tabpanel" aria-label={tab === "volunteer" ? "Calls for volunteers" : "Calls for donations"} className="mt-1 divide-y">
        {calls.length === 0 && <li className="py-3 text-sm text-muted-foreground">No open calls right now</li>}
        {/* Compact (F-092): who's asking and when on one line, the ask on the next, the button beside. */}
        {calls.map((c) => (
          <li key={c.id} className="group relative flex items-center gap-2.5 py-2.5">
            {c.org && <span className="shrink-0"><OrgMark org={c.org} size="sm" /></span>}
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-baseline gap-1.5 text-[13px] leading-5">
                {/* Who's asking wins the space; the date and goal truncate first. */}
                {c.org && <span className="max-w-[70%] shrink-0 truncate font-semibold">{c.org.name}</span>}
                {(c.action_date || c.goal_usd) && (
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {c.action_date && `${tab === "donate" ? "by " : ""}${day(c.action_date)}`}
                    {c.action_date && c.goal_usd && ", "}
                    {c.goal_usd && `${formatUsd(c.goal_usd)} goal`}
                  </span>
                )}
              </p>
              <Link href={`/p/${c.id}`} className="line-clamp-1 text-xs leading-4 text-muted-foreground group-hover:text-foreground after:absolute after:inset-0">{c.body}</Link>
            </div>
            {tab === "donate" && c.org ? (
              <DonateDialog org={c.org} signedIn={signedIn} size="xs" tone="amber" className="relative shrink-0 [&_svg]:hidden" />
            ) : (
            <a href={c.action_url!} target="_blank" rel="noopener noreferrer"
              className={cn("relative shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-transform active:scale-95", tab === "volunteer" ? "bg-leaf hover:bg-leaf/90" : "bg-amber-600 hover:bg-amber-700")}>
              {tab === "volunteer" ? "Sign up" : "Donate"}<span className="sr-only"> for {c.org?.name}</span>
            </a>
            )}
          </li>
        ))}
      </ul>
      <Link href={all} className="block border-t pt-2.5 text-sm font-semibold text-leaf hover:underline">See all {tab === "volunteer" ? "volunteer calls" : "donation calls"}</Link>
    </Panel>
  )
}
