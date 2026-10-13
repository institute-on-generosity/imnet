import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

// Explicit paging instead of infinite scroll (design principle #4: no engineered loops).
export function OlderPosts({ olderHref, newestHref, isFirstPage }: { olderHref: string | null; newestHref: string; isFirstPage: boolean }) {
  if (!olderHref && isFirstPage) return null
  return (
    <nav aria-label="More posts" className="flex items-center justify-between gap-3 py-2">
      {!isFirstPage ? <Link href={newestHref} className="text-sm text-muted-foreground hover:text-foreground hover:underline">Back to newest</Link> : <span />}
      {olderHref ? (
        <Link href={olderHref} className={buttonVariants({ variant: "outline" })}>Show older posts</Link>
      ) : (
        <span className="text-sm text-muted-foreground">You&apos;re all caught up.</span>
      )}
    </nav>
  )
}
