import { CalendarDays, ExternalLink, HandCoins, HandHelping, Target } from "lucide-react"
import { formatUsd } from "@/lib/grants"
import { todayISO } from "@/lib/open-calls"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./ui/button"

const longDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

// A call for volunteers or donations (F-084): when or by when, the goal (donations), and the button.
// No progress bar: imnet can't verify how much has been raised.
export function CallBlock({ post }: { post: Pick<Post, "kind" | "action_url" | "action_date" | "goal_usd" | "org"> }) {
  if (!post.action_url || (post.kind !== "call_volunteers" && post.kind !== "call_donations")) return null
  const volunteers = post.kind === "call_volunteers"
  const ended = !!post.action_date && post.action_date < todayISO()
  const Icon = volunteers ? HandHelping : HandCoins
  return (
    <div className={cn("mx-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border p-3", volunteers ? "border-leaf/30 bg-leaf-soft/60" : "border-marigold/40 bg-marigold-soft/70")}>
      <Icon className={cn("size-6 shrink-0", volunteers ? "text-leaf" : "text-amber-700")} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{volunteers ? "Volunteers needed" : "Donations needed"}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
          {post.action_date && (
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{volunteers ? longDay(post.action_date) : `By ${longDay(post.action_date)}`}</span>
          )}
          {post.goal_usd && <span className="inline-flex items-center gap-1"><Target className="size-3.5" aria-hidden />Goal {formatUsd(post.goal_usd)}</span>}
        </p>
      </div>
      {ended ? (
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Ended</span>
      ) : (
        <a href={post.action_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", className: volunteers ? "" : "bg-amber-600 text-white hover:bg-amber-700" })}>
          {volunteers ? "Sign up" : "Donate"}<ExternalLink data-icon="inline-end" aria-hidden /><span className="sr-only"> (opens {post.org?.name ?? "their"} site)</span>
        </a>
      )}
    </div>
  )
}
