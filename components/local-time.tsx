"use client"

// Renders a time in the viewer's own time zone (the server doesn't know it).
const FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  full: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
  date: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  day_short: { weekday: "short", month: "short", day: "numeric" },
  clock: { hour: "numeric", minute: "2-digit", timeZoneName: "short" },
  month: { month: "short" },
  day: { day: "numeric" },
}

export function LocalTime({ iso, format = "full" }: { iso: string; format?: "full" | "time" | "date" | "clock" | "month" | "day" | "day_short" }) {
  const text = new Date(iso).toLocaleString("en-US", FORMATS[format])
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>
}
