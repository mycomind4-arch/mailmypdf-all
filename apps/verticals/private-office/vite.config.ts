import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  resolve: {
    alias: {
      "@mailmypdf/core": fileURLToPath(
        new URL("../../../packages/core/src/index.ts", import.meta.url),
      ),
      "@mailmypdf/documents": fileURLToPath(
        new URL("../../../packages/documents/src/index.ts", import.meta.url),
      ),
      "@mailmypdf/intelligence": fileURLToPath(
        new URL("../../../packages/intelligence/src/index.ts", import.meta.url),
      ),
      "@mailmypdf/workflows": fileURLToPath(
        new URL("../../../packages/workflows/src/index.ts", import.meta.url),
      ),
    },
  },
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "cloudflare-pages" },
});
