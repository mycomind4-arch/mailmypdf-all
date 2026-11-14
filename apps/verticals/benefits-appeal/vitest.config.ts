import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Vitest executes TypeScript directly; avoid resolving the package's published dist entry.
      '@mailmypdf/pricing': fileURLToPath(new URL('../../../packages/pricing/src/index.ts', import.meta.url)),
    },
  },
  test: { include: ['src/**/*.test.ts', 'tests/payment/*.test.ts', 'tests/vitest/*.test.ts'], environment: 'node' },
});
