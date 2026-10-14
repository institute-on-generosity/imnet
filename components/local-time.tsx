"use client"

// Renders a time in the viewer's own time zone (the server doesn't know it).
const FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  full: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
  month: { month: "short" },
  day: { day: "numeric" },
}

export function LocalTime({ iso, format = "full" }: { iso: string; format?: "full" | "time" | "month" | "day" }) {
  const text = new Date(iso).toLocaleString("en-US", FORMATS[format])
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>
}
