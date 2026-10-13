import { postImageUrl } from "@/lib/queries"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"

// LinkedIn-style photo layouts: 1 full, 2 side by side, 3 = one large + two, 4 = a 2×2 grid.
const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 grid-rows-2",
  4: "grid-cols-2 grid-rows-2",
}

export function PostMedia({ post }: { post: Pick<Post, "org" | "embed_url" | "embed_credit" | "image_paths" | "image_alts" | "image_credits"> }) {
  const images = post.image_paths.slice(0, 4)
  const credits = [...new Set(post.image_credits.filter(Boolean))]

  return (
    <>
      {images.length > 0 && (
        <figure className="mt-3">
          {/* Fixed 4:3 frame so lazy-loaded photos don't shift the feed as they arrive */}
          <div className={cn("grid aspect-[4/3] gap-0.5 bg-muted", GRID[images.length])}>
            {images.map((path, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={path}
                src={postImageUrl(path)}
                alt={post.image_alts[i] ?? ""}
                loading="lazy"
                className={cn(
                  "h-full w-full object-cover",
                  images.length === 3 && i === 0 && "row-span-2",
                )}
              />
            ))}
          </div>
          {credits.length > 0 && (
            <figcaption className="px-4 pt-1.5 text-[11px] text-muted-foreground">Photo: {credits.join("; ")}</figcaption>
          )}
        </figure>
      )}
      {post.embed_url && (
        <figure className="mt-3">
          <div className="aspect-video bg-muted">
            <iframe
              src={post.embed_url}
              className="h-full w-full"
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              title={`Video shared by ${post.org.name}`}
            />
          </div>
          {post.embed_credit && (
            <figcaption className="px-4 pt-1.5 text-[11px] text-muted-foreground">Video: {post.embed_credit}</figcaption>
          )}
        </figure>
      )}
    </>
  )
}
