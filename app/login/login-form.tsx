"use client"

import { Mail } from "lucide-react"
import { useActionState } from "react"
import { sendMagicLink } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const LOCAL = /\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")

export function LoginForm({ next = "/" }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, null)
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Input type="email" name="email" placeholder="you@example.com" required defaultValue={state?.values?.email} />
      <Button type="submit" disabled={pending} className="w-full">
        <Mail aria-hidden />
        {pending ? "Sending..." : "Email me a link"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
      {/* Local Supabase doesn't send real email: links land in its test inbox (Mailpit). */}
      {state?.ok && LOCAL && (
        <p className="text-sm text-muted-foreground">
          Running locally: open the test inbox at{" "}
          <a href="http://127.0.0.1:54324" target="_blank" rel="noopener noreferrer" className="font-medium text-leaf underline">127.0.0.1:54324</a>
        </p>
      )}
    </form>
  )
}
