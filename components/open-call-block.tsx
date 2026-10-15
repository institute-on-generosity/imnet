import { CalendarClock, ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { formatUsd } from "@/lib/grants"
import { callStatus, formatDeadline, todayISO } from "@/lib/open-calls"
import { getCauses } from "@/lib/queries"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS = {
  open: { label: "Open", className: "bg-leaf-soft text-leaf" },
  closing_soon: { label: "Closing soon", className: "bg-marigold-soft text-foreground" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
}

// The details of a foundation's open call, with a link out to apply.
export async function OpenCallBlock({ post }: { post: Pick<Post, "call_deadline" | "call_apply_url" | "call_max_award" | "call_causes"> }) {
  if (!post.call_deadline || !post.call_apply_url) return null
  const status = callStatus(post.call_deadline, todayISO())
  const names = new Map((await getCauses()).map((c) => [c.slug, c.name]))
  const causes = post.call_causes.map((c) => names.get(c) ?? c)

  const today = todayISO()
  const left = Math.round((Date.parse(`${post.call_deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  const when = status === "closed" ? `Closed ${formatDeadline(post.call_deadline)}` : `Apply by ${formatDeadline(post.call_deadline)}`
  const countdown = status === "closed" ? null : left === 0 ? "closes today" : `${left} ${left === 1 ? "day" : "days"} left`

  // F-093 hierarchy: the award first (what you can get), then the deadline (when), then causes
  // (who it's for), with Apply as the one action.
  return (
    <div className="mx-4 mt-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary/70">Grant opportunity</p>
          <p className="mt-0.5 font-heading text-xl leading-tight font-semibold">
            {post.call_max_award ? `Up to ${formatUsd(post.call_max_award)}` : "Open call for grantees"}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
            <CalendarClock className="size-4 shrink-0 text-primary/70" aria-hidden />
            <span className="font-medium">{when}</span>
            {countdown && <span className={cn("text-muted-foreground", status === "closing_soon" && "font-medium text-amber-700")}>({countdown})</span>}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[status].className)}>{STATUS[status].label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-primary/10 pt-3">
        <ul aria-label="Causes" className="flex min-w-0 flex-wrap gap-1.5 text-xs">
          {causes.length ? causes.map((c) => <li key={c} className="rounded-full bg-card px-2.5 py-0.5 ring-1 ring-border">{c}</li>) : <li className="text-muted-foreground">Open to all causes</li>}
        </ul>
        {status !== "closed" && (
          <a href={post.call_apply_url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "sm" }), "shrink-0 rounded-full px-4")}>
            Apply <ExternalLink data-icon="inline-end" aria-hidden />
          </a>
        )}
      </div>
    </div>
  )
}
