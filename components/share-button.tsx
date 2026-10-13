"use client"

import { Send } from "lucide-react"
import { useState } from "react"
import { logEvent } from "@/app/actions"
import { cn } from "@/lib/utils"

export function ShareButton({ path, title, orgId, postId, variant = "action" }: { path: string; title: string; orgId: string; postId?: string; variant?: "action" | "pill" }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}${path}`
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      void logEvent("share", orgId, postId)
    } catch {
      // User cancelled the share sheet.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        variant === "action"
          ? "rounded-md px-3 py-2.5 text-muted-foreground hover:bg-muted"
          : "h-8 rounded-full border border-border bg-background px-3 hover:bg-muted",
      )}
    >
      <Send className="size-4" aria-hidden />
      {copied ? "Link copied" : "Share"}
    </button>
  )
}
