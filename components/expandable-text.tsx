"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Clamps long text to a few lines with an inline "…more" toggle, as LinkedIn does.
export function ExpandableText({ children, lines = 4, className }: { children: string; lines?: number; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [children])

  return (
    <div className="relative">
      <p
        ref={ref}
        className={cn("whitespace-pre-line", className)}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {/* Collapsed: join paragraphs so the clamp's ellipsis lands on text, not a blank line */}
        {open ? children : children.replace(/\s*\n+\s*/g, " ")}
      </p>
      {overflows && !open && (
        <button type="button" onClick={() => setOpen(true)} className="absolute right-0 bottom-0 bg-card pl-1 text-sm font-medium text-muted-foreground hover:text-leaf hover:underline">
          …more
        </button>
      )}
    </div>
  )
}
