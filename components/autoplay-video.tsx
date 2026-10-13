"use client"

import { useEffect, useRef } from "react"

// LinkedIn-style feed video: plays muted while mostly on screen, pauses when scrolled away.
// No autoplay for people who ask their device to reduce motion; native controls for everyone.
export function AutoplayVideo({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: [0, 0.6, 1] },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      className="h-full w-full bg-black object-cover"
    />
  )
}
