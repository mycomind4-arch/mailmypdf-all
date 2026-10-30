import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const factoryWorkflow = readFileSync(
  new URL("../../.github/workflows/factory-validation.yml", import.meta.url),
  "utf8",
);

test("factory acceptance tests serialize workspace tasks that rebuild shared dist modules", () => {
  // App tests import @mailmypdf/workflows/dist while other workspace tasks
  // may rebuild that package. Parallel builds can temporarily expose a
  // partial ESM barrel and fail with MISSING_EXPORT / SyntaxError.
  assert.match(
    factoryWorkflow,
    /- name: Run tests\s*\n\s*run: pnpm exec turbo test --concurrency=1\s*(?:\n|$)/,
  );
  assert.match(
    factoryWorkflow,
    /- name: Build workspace[\s\S]*?run: pnpm exec turbo build --concurrency=1\s*(?:\n|$)/,
  );
});
