import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"

const SIZES = {
  md: "size-12 text-xl rounded-lg",
  lg: "size-16 text-3xl rounded-xl",
  xl: "size-24 text-5xl rounded-2xl border-4 border-card",
}

// Org logo, or a serif monogram when there isn't one. Square-ish, like company logos on LinkedIn.
export function OrgMark({ org, size = "md" }: { org: Pick<OrgSummary, "name" | "logo_url">; size?: keyof typeof SIZES }) {
  if (org.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={org.logo_url} alt="" className={cn(SIZES[size], "shrink-0 bg-card object-cover")} />
  }
  return (
    <span aria-hidden className={cn(SIZES[size], "grid shrink-0 place-items-center bg-leaf-soft font-heading text-leaf")}>
      {org.name.trim().charAt(0)}
    </span>
  )
}
