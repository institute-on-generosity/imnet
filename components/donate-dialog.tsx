"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Check, CreditCard, Gift, Lock, X } from "lucide-react"
import { useState, useTransition } from "react"
import { donate, logEvent, shareGift, type DonationReceipt } from "@/app/actions"
import Link from "@/components/intent-link"
import { buttonVariants } from "@/components/ui/button"
import { formatUsd } from "@/lib/grants"
import { brandOf, digits, feeCents, formatCardNumber, formatExpiry, MAX_USD, MIN_USD, PRESETS_USD, TEST_CARD } from "@/lib/payments/test-gateway"
import type { OrgSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OrgMark } from "./org-mark"

type Org = Pick<OrgSummary, "id" | "name" | "slug" | "logo_url" | "org_type">
type Props = { org: Org; signedIn: boolean; giftFunds?: string | null; label?: string; size?: "default" | "sm" | "xs"; tone?: "primary" | "amber"; className?: string }

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
const FIELD = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"

// F-099: give to a nonprofit or foundation without leaving imnet. Amount -> card -> receipt, in
// test mode. No dark patterns: one-time is the default, covering fees and monthly are opt-in, no
// timers, and the total is on the button before you press it.
export function DonateDialog({ org, signedIn, giftFunds, label = "Donate", size = "default", tone = "primary", className }: Props) {
  const trigger = cn(
    buttonVariants({ size }),
    tone === "amber" && "bg-amber-600 text-white hover:bg-amber-700",
    className,
  )
  if (!signedIn) {
    return <Link href={`/login?next=/o/${org.slug}`} className={trigger}><Gift aria-hidden />{label}<span className="sr-only"> to {org.name} (sign in)</span></Link>
  }
  return (
    <Dialog.Root>
      <Dialog.Trigger className={trigger} onClick={() => void logEvent("donate_click", org.id)}><Gift aria-hidden />{label}<span className="sr-only"> to {org.name}</span></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" style={{ backgroundColor: "rgb(20 33 61 / 0.4)" }} />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-card shadow-xl transition-all outline-none data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <Flow org={org} giftFunds={giftFunds} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Flow({ org, giftFunds }: { org: Org; giftFunds?: string | null }) {
  const [step, setStep] = useState<"amount" | "pay" | "done">("amount")
  const [monthly, setMonthly] = useState(false)
  const [preset, setPreset] = useState<number | null>(50)
  const [other, setOther] = useState("")
  const [coverFees, setCoverFees] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", zip: "" })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null)
  const [pending, start] = useTransition()

  const amountUsd = preset ?? (Number(digits(other)) || 0)
  const validAmount = amountUsd >= MIN_USD && amountUsd <= MAX_USD
  const fee = validAmount ? feeCents(amountUsd * 100) : 0
  const totalCents = amountUsd * 100 + (coverFees ? fee : 0)
  const brand = brandOf(card.number)

  const submit = () =>
    start(async () => {
      setError(null)
      const r = await donate({ orgId: org.id, amountUsd, monthly, coverFees, anonymous, card })
      if (r.ok) {
        setReceipt(r.receipt)
        setStep("done")
      } else setError({ field: r.field, message: r.error })
    })

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <OrgMark org={org} size="md" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="h-section">{step === "done" ? "Thank you" : `Give to ${org.name}`}</Dialog.Title>
          <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
            <span className="rounded-full bg-marigold-soft px-2 py-0.5 font-semibold text-amber-900">Test mode</span>
            No real money moves
          </Dialog.Description>
        </div>
        <Dialog.Close aria-label="Close" className="-mt-1 -mr-1 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden />
        </Dialog.Close>
      </div>

      {step === "amount" && (
        <div className="mt-5 space-y-4">
          <div role="radiogroup" aria-label="How often" className="grid grid-cols-2 rounded-lg bg-muted p-0.5 text-sm font-medium">
            {[false, true].map((m) => (
              <button key={String(m)} type="button" role="radio" aria-checked={monthly === m} onClick={() => setMonthly(m)}
                className={cn("rounded-md py-1.5 transition-colors", monthly === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {m ? "Monthly" : "One time"}
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Amount" className="grid grid-cols-4 gap-2">
            {PRESETS_USD.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={preset === a} onClick={() => { setPreset(a); setOther("") }}
                className={cn("h-11 rounded-lg border text-base font-semibold transition-[color,background-color,transform] active:scale-95", preset === a ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/30")}>
                ${a}
              </button>
            ))}
          </div>
          <label className="relative block">
            <span className="sr-only">Other amount in dollars</span>
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input inputMode="numeric" placeholder="Other amount" value={other} onFocus={() => setPreset(null)}
              onChange={(e) => { setPreset(null); setOther(digits(e.target.value).slice(0, 6)) }}
              className={cn(FIELD, "pl-7", preset === null && other && "border-primary")} />
          </label>
          {!validAmount && preset === null && other && <p className="text-sm text-destructive">Choose an amount between ${MIN_USD} and ${MAX_USD.toLocaleString("en-US")}.</p>}

          {giftFunds && <p className="story rounded-lg bg-marigold-soft/60 px-3 py-2 text-[0.95rem] leading-snug">{giftFunds}</p>}

          <div className="space-y-2.5 text-sm">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={coverFees} onChange={(e) => setCoverFees(e.target.checked)} className="mt-0.5 size-4 accent-[var(--leaf)]" />
              <span>Add {validAmount ? money(fee) : "the fee"} so {org.name} gets the full {validAmount ? formatUsd(amountUsd) : "gift"}<span className="block text-xs text-faint">Covers the processing fee (2.2% + 30¢)</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-0.5 size-4 accent-[var(--leaf)]" />
              <span>Give anonymously<span className="block text-xs text-faint">{org.name} sees the amount, not your name.</span></span>
            </label>
          </div>

          <button type="button" disabled={!validAmount} onClick={() => setStep("pay")} className={buttonVariants({ size: "lg", className: "h-11 w-full text-base" })}>
            Continue
          </button>
        </div>
      )}

      {step === "pay" && (
        <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
            <span><span className="font-semibold">{money(totalCents)}</span> {monthly ? "monthly" : "one time"}{coverFees && <span className="text-faint"> (incl. {money(fee)} fee)</span>}</span>
            <button type="button" onClick={() => { setStep("amount"); setError(null) }} className="font-semibold text-leaf hover:underline">Change</button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="cc-number" className="text-sm font-medium">Card number</label>
              <button type="button" onClick={() => { setCard({ number: TEST_CARD, exp: "12 / 30", cvc: "123", zip: "94110" }); setError(null) }} className="text-xs font-semibold text-leaf hover:underline">Use a test card</button>
            </div>
            <div className="relative">
              <input id="cc-number" autoComplete="cc-number" inputMode="numeric" placeholder="1234 1234 1234 1234" value={card.number}
                aria-invalid={error?.field === "number" || undefined} aria-describedby={error ? "pay-error" : undefined}
                onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} className={cn(FIELD, "pr-24 tabular-nums")} />
              <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-muted-foreground">
                <CreditCard className="size-4" aria-hidden />{digits(card.number).length >= 2 ? brand : ""}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="cc-exp" className="text-sm font-medium">Expiry</label>
              <input id="cc-exp" autoComplete="cc-exp" inputMode="numeric" placeholder="MM / YY" value={card.exp}
                aria-invalid={error?.field === "exp" || undefined} onChange={(e) => setCard({ ...card, exp: formatExpiry(e.target.value) })} className={cn(FIELD, "tabular-nums")} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cc-cvc" className="text-sm font-medium">CVC</label>
              <input id="cc-cvc" autoComplete="cc-csc" inputMode="numeric" placeholder="123" value={card.cvc}
                aria-invalid={error?.field === "cvc" || undefined} onChange={(e) => setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) })} className={cn(FIELD, "tabular-nums")} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cc-zip" className="text-sm font-medium">ZIP</label>
              <input id="cc-zip" autoComplete="postal-code" placeholder="94110" value={card.zip} onChange={(e) => setCard({ ...card, zip: e.target.value.slice(0, 10) })} className={FIELD} />
            </div>
          </div>
          {error && <p id="pay-error" role="alert" className="text-sm text-destructive">{error.message}</p>}

          <button type="submit" disabled={pending} className={buttonVariants({ size: "lg", className: "h-11 w-full text-base" })}>
            <Lock aria-hidden />{pending ? "Processing..." : `Give ${money(totalCents)}${monthly ? " monthly" : ""}`}
          </button>
          <p className="text-center text-xs text-faint">Test mode: try 4242 4242 4242 4242. Card details aren&apos;t stored.</p>
        </form>
      )}

      {step === "done" && receipt && (
        <div className="mt-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-leaf text-white"><Check className="size-7" aria-hidden /></span>
          <p className="mt-3 font-heading text-3xl font-semibold">{money(receipt.amountCents)}</p>
          <p className="text-sm text-muted-foreground">to {receipt.orgName}{receipt.monthly ? ", every month" : ""}</p>
          <dl className="mt-5 divide-y rounded-lg border text-left text-sm">
            <Row label="Charged">{money(receipt.amountCents + receipt.feeCents)}{receipt.feeCents > 0 && <span className="text-faint"> (incl. {money(receipt.feeCents)} fee)</span>}</Row>
            <Row label="Card">{receipt.brand} ending {receipt.last4}</Row>
            {receipt.monthly && <Row label="Next gift">{nextMonth(receipt.createdAt)}</Row>}
            <Row label="Reference"><span className="font-mono text-xs">{receipt.ref}</span></Row>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">Added to your <Link href="/giving" className="font-semibold text-leaf hover:underline">giving journal</Link> (private)</p>
          <ShareGift orgId={org.id} slug={org.slug} donationId={receipt.id} amount={money(receipt.amountCents)} />
          <Dialog.Close className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 h-11 w-full" })}>Done</Dialog.Close>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

const nextMonth = (iso: string) => {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + 1)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// F-117: one tap to tell your followers you gave (an experience; the amount stays private).
function ShareGift({ orgId, slug, donationId, amount }: { orgId: string; slug: string; donationId: string; amount: string }) {
  const [state, setState] = useState<"idle" | "sharing" | "shared" | "error">("idle")
  const [showAmount, setShowAmount] = useState(false)
  if (state === "shared") return <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf"><Check className="size-4" aria-hidden />Shared with your followers</p>
  return (
    <div className="mt-3 text-left">
      <label className="flex cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showAmount} onChange={(e) => setShowAmount(e.target.checked)} className="size-4 accent-[var(--leaf)]" />
        Show the amount ({amount})
      </label>
      <button type="button" disabled={state === "sharing"} onClick={async () => { setState("sharing"); setState((await shareGift(orgId, slug, donationId, showAmount)) ? "shared" : "error") }}
        className={buttonVariants({ size: "lg", className: "mt-2 h-11 w-full" })}>
        {state === "sharing" ? "Sharing..." : state === "error" ? "Try again" : "Tell your followers you gave"}
      </button>
    </div>
  )
}
