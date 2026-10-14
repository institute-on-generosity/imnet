import { isAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-12 text-lg", xl: "size-24 text-4xl sm:size-28" }

// A person's picture: their illustrated avatar, or their initial when they have none.
export function PersonAvatar({ name, avatarUrl, size = "md", className }: { name: string; avatarUrl?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const base = cn("shrink-0 rounded-full", SIZES[size], className)
  if (isAvatarUrl(avatarUrl)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" aria-hidden width={112} height={112} loading="lazy" className={cn(base, "bg-muted object-cover")} />
  }
  return (
    <span aria-hidden className={cn(base, "grid place-items-center bg-leaf-soft font-semibold text-leaf")}>
      {name.replace("@", "").charAt(0).toUpperCase()}
    </span>
  )
}
