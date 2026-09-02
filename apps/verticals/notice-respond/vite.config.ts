import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@mailmypdf/workflows": path.resolve(__dirname, "../../packages/workflows/src/index.ts"),
    },
  },
  ssr: {
    noExternal: ["@mailmypdf/workflows"],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-pages",
    serverDir: "server",
  },
});
