"use client"

import NextLink from "next/link"
import { useState } from "react"

// next/link that fully prefetches a page the moment someone shows intent (hover, focus, touch).
// Without it, dynamic pages prefetch only their loading skeleton, and React then keeps that
// skeleton up for at least 300ms; with the full page ready, clicks swap instantly. In view,
// links still prefetch the cheap skeleton (Next's default). Prefetching runs in production.
export default function Link({ onMouseEnter, onFocus, onTouchStart, prefetch, ...props }: React.ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false)
  const warm = () => setIntent(true)
  return (
    <NextLink
      {...props}
      prefetch={prefetch === false ? false : intent ? true : prefetch}
      onMouseEnter={(e) => { warm(); onMouseEnter?.(e) }}
      onFocus={(e) => { warm(); onFocus?.(e) }}
      onTouchStart={(e) => { warm(); onTouchStart?.(e) }}
    />
  )
}
