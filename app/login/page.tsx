import { LogIn } from "lucide-react"
import { devSignIn } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { safeNext } from "@/lib/safe-next"
import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in" }

// Local development: a one-click sign-in for the developer's own account (see devSignIn).
const DEV_LOGIN = process.env.DEV_LOGIN_EMAIL && process.env.DEV_LOGIN_PASSWORD && /\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams
  const to = safeNext(next)
  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {DEV_LOGIN && (
        <form action={devSignIn.bind(null, to)} className="space-y-1 rounded-lg border border-dashed p-3">
          <Button type="submit" variant="outline" className="w-full"><LogIn aria-hidden />Continue as {process.env.DEV_LOGIN_EMAIL}</Button>
          <p className="text-center text-xs text-muted-foreground">Local development only</p>
          {typeof error === "string" && <p className="text-sm text-destructive">{error}</p>}
        </form>
      )}
      <p className="text-muted-foreground">We&apos;ll email you a link. No password needed.</p>
      <LoginForm next={to} />
    </div>
  )
}
