import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground">We&apos;ll email you a link. No password needed.</p>
      <LoginForm />
    </div>
  )
}
