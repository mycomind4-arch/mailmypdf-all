import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../../../src") } },
  define: { "process.env": "{}" },
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
});
