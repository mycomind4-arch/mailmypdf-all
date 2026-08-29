// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-pages",
  },
  vite: {
    resolve: {
      alias: {
        // Force tslib to resolve to its ESM build so the Nitro/rolldown bundler
        // doesn't generate broken CJS-to-ESM interop code (pdf-lib uses tslib
        // helpers via TypeScript's importHelpers, and the CJS wrapper causes
        // "Cannot destructure property '__extends' of 'undefined" in Workers).
        // In monorepo: resolve from root node_modules (pnpm hoists to workspace root).
        tslib: path.resolve(import.meta.dirname, "../../node_modules/tslib/tslib.es6.mjs"),
      },
    },
  },
});
