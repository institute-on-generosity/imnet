import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e builds into its own folder so it never disturbs the dev server (B-034).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // F-121: the Following page became Discover.
  async redirects() {
    return [{ source: "/following", destination: "/discover", permanent: true }]
  },
  experimental: {
    // Snappy back-and-forth: reuse a page loaded in the last 30s (dynamic) or fully prefetched in
    // the last 60s (static). Server actions and router.refresh() (after every one-click signal)
    // clear it, so what you just did always shows.
    staleTimes: { dynamic: 30, static: 60 },
  },
};

export default nextConfig;
