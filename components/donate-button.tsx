"use client"

import { HeartHandshake, NotebookPen } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { logEvent } from "@/app/actions"
import { buttonVariants } from "@/components/ui/button"

// Phase I: opens the org's Every.org donate flow (Every.org handles payment and receipts).
// TODO: swap for the Every.org embedded button script so donors never leave the page.
// Signed in, a quiet link to log the gift in the private giving journal appears after the click.
export function DonateButton({ orgId, everyorgSlug, signedIn }: { orgId: string; everyorgSlug: string; signedIn?: boolean }) {
  const [clicked, setClicked] = useState(false)
  return (
    <>
      <a
        href={`https://www.every.org/${everyorgSlug}#/donate`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline" })}
        onClick={() => {
          setClicked(true)
          void logEvent("donate_click", orgId)
        }}
      >
        <HeartHandshake aria-hidden />
        Donate
      </a>
      {signedIn && clicked && (
        <Link href={`/giving?org=${orgId}`} className="inline-flex items-center gap-1.5 text-sm text-leaf hover:underline">
          <NotebookPen className="size-4" aria-hidden />Gave? Log it
        </Link>
      )}
    </>
  )
}
