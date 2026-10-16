import { CircleAlert, CircleCheck, CircleX, ExternalLink, FileText } from "lucide-react"
import { checkClaim, displayName, overall, type IrsOrg } from "@/lib/irs/check"
import { lookupIrsOrg, nombotPublicUrl } from "@/lib/irs/nombot"
import { formatUsd } from "@/lib/grants"
import { cn } from "@/lib/utils"
import { RailHeading } from "./rail-cards"
import { Panel } from "./shell"

const ICON = { ok: CircleCheck, warn: CircleAlert, fail: CircleX }
const TONE = { ok: "text-leaf", warn: "text-amber-700", fail: "text-destructive" }
const SUMMARY = { ok: "IRS records match", warn: "IRS records: check before approving", fail: "IRS records don't support this claim" }

// F-109: next to each pending claim, what IRS records say (looked up live, so it can't be forged).
export async function ClaimIrsCheck({ claim }: { claim: { ein: string; org_name: string; org_type: "nonprofit" | "foundation" } }) {
  const irs = await lookupIrsOrg(claim.ein)
  if (irs === null && !process.env.NOMBOT_URL) return <p className="text-muted-foreground">IRS lookup isn&apos;t set up (NOMBOT_URL). Check the EIN by hand.</p>
  const checks = checkClaim(claim, irs)
  const level = overall(checks)
  const link = irs && nombotPublicUrl(irs.nombotUrl)
  return (
    <div className="rounded-lg border p-3">
      <p className={cn("flex items-center gap-1.5 font-semibold", TONE[level])}>{(() => { const I = ICON[level]; return <I className="size-4" aria-hidden /> })()}{SUMMARY[level]}</p>
      <ul className="mt-1.5 space-y-1">
        {checks.map((c) => {
          const I = ICON[c.level]
          return <li key={c.label} className="flex items-start gap-1.5"><I className={cn("mt-0.5 size-3.5 shrink-0", TONE[c.level])} aria-hidden />{c.label}</li>
        })}
      </ul>
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-leaf hover:underline">Full IRS record on NomBot<ExternalLink className="size-3" aria-hidden /></a>}
    </div>
  )
}

const short = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : formatUsd(n))

// F-110: an org's public filings beside its story: the track record donors and advisors ask about.
// Shown only when the EIN is in IRS records; all numbers come straight from filings.
export function PublicFilings({ irs }: { irs: IrsOrg }) {
  const years = irs.years.filter((y) => y.revenue != null).slice(0, 3)
  const link = nombotPublicUrl(irs.nombotUrl)
  const age = irs.ruling ? new Date().getFullYear() - Number(irs.ruling) : null
  return (
    <Panel aria-labelledby="public-filings" className="p-4 text-sm">
      <RailHeading id="public-filings">Public filings</RailHeading>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-faint"><FileText className="size-3" aria-hidden />From IRS records · EIN {irs.ein}</p>

      <dl className="mt-3 space-y-2">
        <div><dt className="text-xs text-muted-foreground">Legal name</dt><dd className="font-medium">{displayName(irs.name)}</dd></div>
        <div className="grid grid-cols-2 gap-3">
          <div><dt className="text-xs text-muted-foreground">Tax-exempt</dt><dd className="font-medium">{irs.subsection ? `501(c)(${Number(irs.subsection)})` : "Listed"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Recognized</dt><dd className="font-medium">{irs.ruling ? `${irs.ruling}${age ? ` (${age} yrs)` : ""}` : "Not listed"}</dd></div>
        </div>
      </dl>

      {years.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <ul className="mt-1 space-y-0.5">
            {years.map((y) => (
              <li key={`${y.year}-${y.source}`} className="flex justify-between gap-2"><span className="text-muted-foreground">{y.year}</span><span className="font-semibold">{short(y.revenue!)}</span></li>
            ))}
          </ul>
        </div>
      )}

      {(irs.grantsReceived.count > 0 || irs.grantsGiven.count > 0) && (
        <div className="mt-3 border-t pt-3">
          {irs.grantsReceived.count > 0 && <p><span className="font-semibold">{short(irs.grantsReceived.total)}</span> <span className="text-muted-foreground">in foundation grants from {irs.grantsReceived.funders.toLocaleString("en-US")} {irs.grantsReceived.funders === 1 ? "funder" : "funders"}</span></p>}
          {irs.grantsGiven.count > 0 && <p><span className="font-semibold">{short(irs.grantsGiven.total)}</span> <span className="text-muted-foreground">granted in {irs.grantsGiven.count.toLocaleString("en-US")} grants</span></p>}
        </div>
      )}

      {irs.leaders.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">Leaders ({irs.leaders[0].year} filing)</p>
          <ul className="mt-1 space-y-1">
            {irs.leaders.slice(0, 3).map((l) => (
              <li key={l.name} className="flex justify-between gap-2">
                <span className="min-w-0"><span className="block truncate font-medium">{displayName(l.name)}</span>{l.title && <span className="block truncate text-xs text-muted-foreground">{displayName(l.title)}</span>}</span>
                {l.pay != null && l.pay > 0 && <span className="shrink-0 text-xs text-muted-foreground">{short(l.pay)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 border-t pt-3 text-sm font-semibold text-leaf hover:underline">Full record on NomBot<ExternalLink className="size-3.5" aria-hidden /></a>}
    </Panel>
  )
}
