"use client"

import { logEvent } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"

// Phase I: opens the org's Every.org donate flow (Every.org handles payment and receipts).
// TODO: swap for the Every.org embedded button script so donors never leave the page.
export function DonateButton({ orgId, everyorgSlug }: { orgId: string; everyorgSlug: string }) {
  return (
    <a
      href={`https://www.every.org/${everyorgSlug}#/donate`}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "default" })}
      onClick={() => void logEvent("donate_click", orgId)}
    >
      Donate
    </a>
  )
}
