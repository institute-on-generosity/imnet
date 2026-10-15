"use client"

import { SendHorizontal } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react"
import { fetchNewMessages, markChatRead, sendMessage } from "@/app/actions"
import Link from "@/components/intent-link"
import type { ChatMessage, ChatTarget } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { PersonAvatar } from "./person-avatar"

const POLL_MS = 3000
const GROUP_GAP_MS = 5 * 60_000
const dayLabel = (iso: string) => {
  const d = new Date(iso), today = new Date()
  const y = new Date(today); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === y.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

// F-100: one chat for groups and direct messages. New messages arrive by polling every few seconds
// while the tab is visible (works without a realtime server). Messages from the same person within
// five minutes group under one name, as in most chat apps.
export function ChatThread({ target, initial, viewerId, placeholder, className }: { target: ChatTarget; initial: ChatMessage[]; viewerId: string; placeholder: string; className?: string }) {
  const [messages, setMessages] = useState(initial)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const list = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const last = messages.at(-1)?.created_at ?? null
  const lastRef = useRef(last)
  useEffect(() => { lastRef.current = last }, [last])
  // A stable key so polling restarts only when the chat itself changes.
  const targetKey = "group" in target ? `group:${target.group}` : `conversation:${target.conversation}`

  // Keep the newest message in view, unless you've scrolled up to read.
  useLayoutEffect(() => {
    const el = list.current
    if (!el || !nearBottom.current) return
    el.scrollTop = el.scrollHeight
    // Again once fonts and avatars have settled the layout.
    const frame = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => cancelAnimationFrame(frame)
  }, [messages.length])

  // Opening a chat reads it (clears the Messages dot on your next page).
  useEffect(() => {
    const [kind, id] = targetKey.split(":")
    void markChatRead(kind === "group" ? { group: id } : { conversation: id })
  }, [targetKey])

  useEffect(() => {
    let stopped = false
    const [kind, id] = targetKey.split(":")
    const chat: ChatTarget = kind === "group" ? { group: id } : { conversation: id }
    const tick = async () => {
      if (stopped || document.visibilityState !== "visible") return
      const fresh = await fetchNewMessages(chat, lastRef.current).catch(() => [])
      if (!stopped && fresh.length) setMessages((m) => merge(m, fresh))
    }
    const timer = setInterval(tick, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [targetKey])

  const send = () => {
    const body = draft.trim()
    if (!body || pending) return
    setError(null)
    start(async () => {
      const r = await sendMessage(target, body)
      if (r.ok) {
        nearBottom.current = true
        setMessages((m) => merge(m, [r.message]))
        setDraft("")
      } else setError(r.error)
    })
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={list} role="log" aria-label="Messages" aria-live="polite"
        onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const continued = !newDay && prev && prev.author.id === m.author.id && Date.parse(m.created_at) - Date.parse(prev.created_at) < GROUP_GAP_MS
          const name = m.author.display_name ?? `@${m.author.handle}`
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex items-center gap-3 text-xs text-faint" role="separator">
                  <span className="h-px flex-1 bg-border" /><span>{dayLabel(m.created_at)}</span><span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn("group flex gap-3", continued ? "mt-0.5" : "mt-3")}>
                <div className="w-9 shrink-0">
                  {!continued && <Link href={`/u/${m.author.handle}`} tabIndex={-1} aria-hidden><PersonAvatar name={name} avatarUrl={m.author.avatar_url} size="md" className="size-9" /></Link>}
                </div>
                <div className="min-w-0 flex-1">
                  {!continued && (
                    <p className="flex items-baseline gap-2 text-sm">
                      <Link href={`/u/${m.author.handle}`} className="font-semibold hover:underline">{m.author.id === viewerId ? "You" : name}</Link>
                      <time dateTime={m.created_at} className="text-xs text-faint">{clock(m.created_at)}</time>
                    </p>
                  )}
                  <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="border-t p-3">
        {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border bg-card px-3 py-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <label htmlFor="chat-input" className="sr-only">{placeholder}</label>
          <textarea id="chat-input" rows={1} value={draft} maxLength={4000} placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
            className="field-sizing-content max-h-40 min-h-6 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
          <button type="submit" disabled={!draft.trim() || pending} aria-label="Send"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-90 disabled:opacity-40">
            <SendHorizontal className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 px-1 text-[11px] text-faint">Enter to send, Shift+Enter for a new line.</p>
      </form>
    </div>
  )
}

function merge(a: ChatMessage[], b: ChatMessage[]) {
  const seen = new Set(a.map((m) => m.id))
  return [...a, ...b.filter((m) => !seen.has(m.id))].sort((x, y) => x.created_at.localeCompare(y.created_at))
}
