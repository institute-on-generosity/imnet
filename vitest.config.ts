import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // e2e/ holds Playwright browser tests (npm run test:e2e), not unit tests.
  test: { exclude: ["e2e/**", "node_modules/**"] },
})
