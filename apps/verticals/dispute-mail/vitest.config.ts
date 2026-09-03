import { defineConfig } from "vitest/config";

// Keep unit and contract tests independent from the Cloudflare/TanStack Start
// production Vite plugin, which expects a browser client during test startup.
export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx,mts,js,mjs}"],
  },
});
