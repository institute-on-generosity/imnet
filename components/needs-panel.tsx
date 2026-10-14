import { CircleCheck, HandCoins, HandHelping, Package } from "lucide-react"
import { NEED_KIND_LABEL, type Need } from "@/lib/needs"
import { Panel } from "./shell"

const ICONS = { item: Package, volunteer: HandHelping, funding: HandCoins }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// What the org needs right now, beyond money, and how to help. Met needs stay a month.
export function NeedsPanel({ needs }: { needs: Need[] }) {
  if (needs.length === 0) return null
  return (
    <Panel aria-labelledby="needs" className="p-4 sm:p-6">
      <h2 id="needs" className="font-sans text-lg font-semibold tracking-normal">Current needs</h2>
      <ul className="mt-3 divide-y border-y">
        {needs.map((n) => {
          const Icon = n.met_at ? CircleCheck : ICONS[n.kind]
          return (
            <li key={n.id} className="flex gap-3 py-3.5">
              <Icon className={n.met_at ? "mt-0.5 size-5 shrink-0 text-leaf" : "mt-0.5 size-5 shrink-0 text-muted-foreground"} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {n.title}
                  <span className="sr-only"> ({NEED_KIND_LABEL[n.kind]})</span>
                </p>
                {n.detail && !n.met_at && <p className="mt-0.5 text-sm text-muted-foreground">{n.detail}</p>}
                {n.met_at && <p className="mt-0.5 text-sm text-leaf">Met {day(n.met_at)}. Thank you.</p>}
              </div>
              {!n.met_at && (
                <a
                  href={n.help_url}
                  target={n.help_url.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="h-fit shrink-0 rounded-full border px-3 py-1 text-sm font-semibold text-leaf hover:bg-leaf-soft"
                >
                  Help<span className="sr-only"> with {n.title}</span>
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
