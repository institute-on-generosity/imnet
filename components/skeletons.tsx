import { cn } from "@/lib/utils"
import { Panel, ThreeColumn, TwoColumn } from "./shell"

// Loading placeholders shown the instant a link is clicked, shaped like the page that's coming,
// so navigation feels immediate. Pulse only when motion is allowed.
export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />
}

export function PostSkeleton() {
  return (
    <Panel className="p-4">
      <div className="flex gap-2">
        <Skel className="size-12 rounded-lg" />
        <div className="flex-1 space-y-2 pt-1">
          <Skel className="h-4 w-40" />
          <Skel className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skel className="h-4 w-full" />
        <Skel className="h-4 w-11/12" />
        <Skel className="h-4 w-2/3" />
      </div>
      <Skel className="mt-4 aspect-[4/3] w-full rounded-none" />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => <Skel key={i} className="h-8" />)}
      </div>
    </Panel>
  )
}

export function RailSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Panel className="space-y-3 p-4">
      <Skel className="h-4 w-32" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skel className="size-10 rounded-lg" />
          <Skel className="h-3 flex-1" />
        </div>
      ))}
    </Panel>
  )
}

export function FeedPageSkeleton() {
  return (
    <ThreeColumn left={<RailSkeleton rows={2} />} right={<RailSkeleton rows={4} />}>
      <Panel className="p-3"><Skel className="h-8 w-full" /></Panel>
      <PostSkeleton />
      <PostSkeleton />
    </ThreeColumn>
  )
}

export function ProfileSkeleton({ person }: { person?: boolean }) {
  return (
    <TwoColumn right={<><RailSkeleton rows={2} /><RailSkeleton rows={4} /></>}>
      <Panel className="overflow-hidden">
        <Skel className="h-28 rounded-none sm:h-36" />
        <div className="px-4 pb-5 sm:px-6">
          <Skel className={cn("-mt-12 border-4 border-card", person ? "size-24 rounded-full sm:size-28" : "size-24 rounded-2xl")} />
          <Skel className="mt-3 h-8 w-64" />
          <Skel className="mt-2 h-5 w-full max-w-md" />
          <Skel className="mt-3 h-4 w-48" />
          <div className="mt-4 flex gap-2"><Skel className="h-8 w-24 rounded-full" /><Skel className="h-8 w-8 rounded-full" /></div>
        </div>
      </Panel>
      <Panel className="space-y-3 p-5"><Skel className="h-5 w-40" /><Skel className="h-4 w-full" /><Skel className="h-4 w-5/6" /></Panel>
      <PostSkeleton />
    </TwoColumn>
  )
}

export function ListPageSkeleton() {
  return (
    <TwoColumn right={<RailSkeleton rows={2} />}>
      <Panel className="space-y-3 p-4"><Skel className="h-5 w-40" /><Skel className="h-4 w-64" /><Skel className="h-8 w-full" /></Panel>
      <Panel className="divide-y px-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3 py-4">
            <Skel className="size-12 rounded-lg" />
            <div className="flex-1 space-y-2 pt-1"><Skel className="h-4 w-1/2" /><Skel className="h-3 w-2/3" /></div>
          </div>
        ))}
      </Panel>
    </TwoColumn>
  )
}
