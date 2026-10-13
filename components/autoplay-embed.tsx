"use client"

import { useEffect, useRef, useState } from "react"
import { autoplaySrc } from "@/lib/autoplay-src"

// Embedded players start muted once 60% on screen (YouTube, Vimeo). Respects reduced motion.
export function AutoplayEmbed({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [current, setCurrent] = useState(src)

  useEffect(() => {
    const frame = ref.current
    if (!frame || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          setCurrent(autoplaySrc(src))
          observer.disconnect()
        }
      },
      { threshold: [0, 0.6] },
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [src])

  return (
    <iframe
      ref={ref}
      src={current}
      className="h-full w-full"
      loading="lazy"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      title={title}
    />
  )
}
