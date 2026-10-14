import { postImageUrl, postVideoUrl } from "@/lib/queries"
import type { Post } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AutoplayEmbed } from "./autoplay-embed"
import { AutoplayVideo } from "./autoplay-video"

// LinkedIn-style photo layouts: 1 full, 2 side by side, 3 = one large + two, 4 = a 2×2 grid.
const GRID: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-2",
  3: "grid-cols-2 grid-rows-2",
  4: "grid-cols-2 grid-rows-2",
}

export function PostMedia({ post }: { post: Pick<Post, "org" | "embed_url" | "embed_credit" | "video_path" | "video_poster_path" | "video_alt" | "video_credit" | "image_paths" | "image_alts" | "image_credits"> }) {
  const images = post.image_paths.slice(0, 4)
  const credits = [...new Set(post.image_credits.filter(Boolean))]

  return (
    <>
      {images.length > 0 && (
        <figure className="mt-3">
          {/* Fixed 4:3 frame so lazy-loaded photos don't shift the feed as they arrive */}
          <div className={cn("grid aspect-[4/3] gap-0.5 overflow-hidden bg-muted", GRID[images.length])}>
            {images.map((path, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={path}
                src={postImageUrl(path)}
                alt={post.image_alts[i] ?? ""}
                loading="lazy"
                className={cn(
                  "h-full min-h-0 w-full object-cover",
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
      {post.video_path && (
        <figure className="mt-3">
          <div className="aspect-video bg-black">
            <AutoplayVideo
              src={postVideoUrl(post.video_path)}
              poster={post.video_poster_path ? postVideoUrl(post.video_poster_path) : undefined}
              label={post.video_alt ?? `Video from ${post.org?.name ?? "imnet"}`}
            />
          </div>
          {post.video_credit && (
            <figcaption className="px-4 pt-1.5 text-[11px] text-muted-foreground">Video: {post.video_credit}</figcaption>
          )}
        </figure>
      )}
      {post.embed_url && (
        <figure className="mt-3">
          <div className="aspect-video bg-muted">
            <AutoplayEmbed src={post.embed_url} title={`Video shared by ${post.org?.name ?? "imnet"}`} />
          </div>
          {post.embed_credit && (
            <figcaption className="px-4 pt-1.5 text-[11px] text-muted-foreground">Video: {post.embed_credit}</figcaption>
          )}
        </figure>
      )}
    </>
  )
}
