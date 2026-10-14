import { cn } from "@/lib/utils"

// LinkedIn-style page grids. Sidebars drop below/away on smaller screens.
export const CONTAINER = "mx-auto w-full max-w-[1128px] px-4 sm:px-6"

export function ThreeColumn({ left, right, children }: { left?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn(CONTAINER, "grid grid-cols-1 gap-6 lg:grid-cols-[225px_minmax(0,1fr)_300px] md:grid-cols-[225px_minmax(0,1fr)]")}>
      <aside className="hidden md:block">{left}</aside>
      <div className="min-w-0 space-y-3">{children}</div>
      <aside className="hidden lg:block">{right}</aside>
    </div>
  )
}

export function TwoColumn({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn(CONTAINER, "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]")}>
      <div className="min-w-0 space-y-3">{children}</div>
      <aside className="space-y-3">{right}</aside>
    </div>
  )
}

// White box with a hairline border: the unit LinkedIn builds everything from.
export function Panel({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("rounded-xl border bg-card", className)} {...props}>
      {children}
    </section>
  )
}
