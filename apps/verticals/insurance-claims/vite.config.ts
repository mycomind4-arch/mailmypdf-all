import { defineConfig } from '@lovable.dev/vite-tanstack-config'
export default defineConfig({tanstackStart:{server:{entry:'src/server'}},nitro:{preset:'cloudflare-pages'}})
