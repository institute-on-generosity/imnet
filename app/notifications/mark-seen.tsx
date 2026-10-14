"use client"

import { useEffect } from "react"
import { markNotificationsSeen } from "@/app/actions"

// Opening the inbox clears the bell's dot.
export function MarkSeen() {
  useEffect(() => {
    void markNotificationsSeen()
  }, [])
  return null
}
