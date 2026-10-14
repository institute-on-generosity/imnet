"use client"

import { Check, Send } from "lucide-react"
import { useState } from "react"
import { logEvent } from "@/app/actions"
import { cn } from "@/lib/utils"
import { IconTip } from "./icon-tip"

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

  const Icon = copied ? Check : Send
  return (
    <IconTip label={copied ? "Link copied" : "Share"}>
      <button
        type="button"
        onClick={share}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors",
          variant === "action" ? "size-9 text-muted-foreground hover:bg-muted" : "size-8 border border-border bg-background hover:bg-muted",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </IconTip>
  )
}
