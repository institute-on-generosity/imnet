import { Users } from "lucide-react"
import { CAUSE_ICON } from "@/lib/cause-icons"
import { communityIconSrc } from "@/lib/community-icon"
import { cn } from "@/lib/utils"

const SIZES = { sm: "size-8 rounded-lg [&>svg]:size-4", md: "size-12 rounded-xl [&>svg]:size-6", lg: "size-16 rounded-2xl [&>svg]:size-8" }

// F-100/F-103: a community's picture, or its cause icon on a soft tile when it has none.
export function CommunityMark({ cause, icon, size = "md", className }: { cause: string | null; icon?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const src = communityIconSrc(icon)
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 bg-muted object-cover ring-1 ring-black/5", SIZES[size], className)} />
  }
  const Icon = (cause && CAUSE_ICON[cause]) || Users
  return <span aria-hidden className={cn("grid shrink-0 place-items-center bg-leaf-soft text-leaf ring-1 ring-leaf/15", SIZES[size], className)}><Icon /></span>
}
