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

  return (
    <div className="mx-4 mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS[status].className)}>{STATUS[status].label}</span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          {status === "closed" ? "Closed" : "Apply by"} {formatDeadline(post.call_deadline)}
        </span>
        {post.call_max_award && <span>Up to {formatUsd(post.call_max_award)}</span>}
      </div>
      <p className="text-muted-foreground">{causes.length ? `For: ${causes.join(", ")}` : "Open to all causes"}</p>
      {status !== "closed" && (
        <a href={post.call_apply_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
          Apply <ExternalLink aria-hidden />
        </a>
      )}
    </div>
  )
}
