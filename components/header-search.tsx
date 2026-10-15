"use client"

import { CalendarDays, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { OrgMark } from "./org-mark"
import { FoundationMark } from "./org-type-badge"
import { PersonAvatar } from "./person-avatar"

type Results = {
  orgs: { slug: string; name: string; logo_url: string | null; org_type: "nonprofit" | "foundation" }[]
  people: { handle: string; name: string; bio: string | null; avatar_url: string | null }[]
  events: { id: string; title: string; starts_at: string; org: string }[]
}
type Item = { key: string; href: string; node: React.ReactNode; group: string }

const empty: Results = { orgs: [], people: [], events: [] }
const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// LinkedIn-style typeahead (F-083): suggestions while you type, arrow keys to move, Enter to open,
// Escape to close. Enter with nothing highlighted opens the full results page.
export function HeaderSearch() {
  const router = useRouter()
  const id = useId()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Results>(empty)
  const [active, setActive] = useState(-1)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((r: Results) => { setResults(r); setActive(-1) })
        .catch(() => {})
    }, 150)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const shown = q.trim().length >= 2 ? results : empty
  const items: Item[] = [
    ...shown.orgs.map((o) => ({ key: `o-${o.slug}`, href: `/o/${o.slug}`, group: "Organizations", node: (
      <><OrgMark org={o} size="sm" /><span className="min-w-0 flex-1 truncate">{o.name}</span>{o.org_type === "foundation" && <FoundationMark />}</>
    ) })),
    ...shown.people.map((p) => ({ key: `u-${p.handle}`, href: `/u/${p.handle}`, group: "People", node: (
      <><PersonAvatar name={p.name} avatarUrl={p.avatar_url} size="xs" className="size-6" /><span className="min-w-0 flex-1 truncate">{p.name}{p.bio && <span className="text-muted-foreground"> · {p.bio}</span>}</span></>
    ) })),
    ...shown.events.map((e) => ({ key: `e-${e.id}`, href: `/e/${e.id}`, group: "Events", node: (
      <><CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden /><span className="min-w-0 flex-1 truncate">{e.title}<span className="text-muted-foreground"> · {when(e.starts_at)}, {e.org}</span></span></>
    ) })),
  ]
  const all = `/search?q=${encodeURIComponent(q.trim())}`
  const go = (href: string) => { setOpen(false); router.push(href) }

  return (
    <div ref={box} className="relative hidden flex-1 sm:block sm:max-w-72">
      <form role="search" action="/search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(active >= 0 ? items[active].href : all) }}>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)) }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
            else if (e.key === "Escape") { setOpen(false); setActive(-1) }
          }}
          placeholder="Search orgs, people, posts"
          aria-label="Search"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          className="h-9 w-full rounded-md bg-muted pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>
      {open && q.trim().length >= 2 && (
        <div className="absolute top-11 left-0 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-popover p-1.5 text-sm shadow-lg">
          <ul id={`${id}-list`} role="listbox" aria-label="Suggestions">
            {items.map((it, i) => (
              <li key={it.key} role="presentation">
                {(i === 0 || items[i - 1].group !== it.group) && <p className="px-2.5 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{it.group}</p>}
                <a
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={active === i}
                  href={it.href}
                  onMouseEnter={() => setActive(i)}
                  onClick={(e) => { e.preventDefault(); go(it.href) }}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${active === i ? "bg-muted" : ""}`}
                >
                  {it.node}
                </a>
              </li>
            ))}
          </ul>
          <a href={all} onClick={(e) => { e.preventDefault(); go(all) }} className="mt-1 flex items-center gap-2 rounded-lg border-t px-2.5 pt-2.5 pb-2 font-semibold text-leaf hover:bg-muted">
            <Search className="size-4" aria-hidden />See all results for &ldquo;{q.trim()}&rdquo;
          </a>
        </div>
      )}
    </div>
  )
}
