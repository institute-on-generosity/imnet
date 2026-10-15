import { Users } from "lucide-react"
import { CAUSE_ICON } from "@/lib/cause-icons"
import { cn } from "@/lib/utils"

const SIZES = { sm: "size-8 rounded-lg [&>svg]:size-4", md: "size-12 rounded-xl [&>svg]:size-6", lg: "size-16 rounded-2xl [&>svg]:size-8" }

// F-100: a community's mark, its cause icon on a soft tile (no uploaded images, no faces).
export function CommunityMark({ cause, size = "md", className }: { cause: string | null; size?: keyof typeof SIZES; className?: string }) {
  const Icon = (cause && CAUSE_ICON[cause]) || Users
  return <span aria-hidden className={cn("grid shrink-0 place-items-center bg-leaf-soft text-leaf ring-1 ring-leaf/15", SIZES[size], className)}><Icon /></span>
}
