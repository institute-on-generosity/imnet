"use client"

import { useEffect } from "react"
import { logEvent } from "@/app/actions"

// Logs one view per mount (client-side, so link prefetches don't count).
export function TrackView({ orgId, postId }: { orgId: string; postId?: string }) {
  useEffect(() => {
    void logEvent("view", orgId, postId)
  }, [orgId, postId])
  return null
}
