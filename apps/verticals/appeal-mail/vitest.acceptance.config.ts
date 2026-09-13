import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Runs the Studio workflow acceptance tests -- see
// docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md. Kept separate from
// vitest.payment.config.ts (unit tests with everything mocked) because
// acceptance runs drive real route handlers end-to-end and can take
// noticeably longer; a single acceptance test file is usually run directly
// by `pnpm studio workflow test <id>` at the repo root, not this script.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/acceptance/**/*.acceptance.ts'],
    environment: 'node',
    // Acceptance runs build real PDFs and (optionally) render pages; give
    // them more headroom than the default unit-test timeout.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
