import { cn } from "@/lib/utils"
import { POST_KIND_LABEL, type PostKind } from "@/lib/types"

const DOT: Record<PostKind, string> = {
  impact_story: "bg-leaf",
  ask: "bg-marigold",
  update: "bg-muted-foreground/60",
  open_call: "bg-primary",
}

export function PostKindLabel({ kind }: { kind: PostKind }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-full", DOT[kind])} />
      {POST_KIND_LABEL[kind]}
    </span>
  )
}
