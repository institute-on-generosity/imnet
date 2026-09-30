"use client"

import { useState } from "react"
import { logEvent } from "@/app/actions"
import { Button } from "@/components/ui/button"

export function ShareButton({ path, title, orgId, postId }: { path: string; title: string; orgId: string; postId?: string }) {
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
    <Button variant="outline" size="sm" onClick={share}>
      {copied ? "Link copied" : "Share"}
    </Button>
  )
}
