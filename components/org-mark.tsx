import { cn } from "@/lib/utils"
import type { OrgSummary } from "@/lib/types"

// Org logo, or a serif monogram when there isn't one.
export function OrgMark({ org, size = "md" }: { org: Pick<OrgSummary, "name" | "logo_url">; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-16 text-3xl" : "size-10 text-lg"
  if (org.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={org.logo_url} alt="" className={cn(box, "shrink-0 rounded-full border object-cover")} />
  }
  return (
    <span aria-hidden className={cn(box, "grid shrink-0 place-items-center rounded-full bg-leaf-soft font-heading text-leaf")}>
      {org.name.trim().charAt(0)}
    </span>
  )
}
