import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const routeRoot = fileURLToPath(new URL("../src/routes/", import.meta.url));
const vitestConfig = fileURLToPath(new URL("../vitest.config.ts", import.meta.url));
const relocatedDir = fileURLToPath(new URL("./vitest/", import.meta.url));

function testsInRouteTree(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return testsInRouteTree(path);
    return entry.isFile() && /\.test\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

test("Benefits Appeal keeps tests outside the TanStack route tree", () => {
  assert.deepEqual(testsInRouteTree(routeRoot), [], "move route-adjacent tests into tests/vitest/");
});

test("Benefits Appeal Vitest discovers the relocated workflow contract tests", () => {
  const config = readFileSync(vitestConfig, "utf8");
  assert.ok(config.includes("tests/vitest/*.test.ts"), "Vitest must include relocated workflow contracts");
  const relocated = readdirSync(relocatedDir);
  for (const name of [
    "car-insurance-appeal.test.ts",
    "financial-aid-reinstatement.test.ts",
    "unemployment-denial.test.ts",
  ]) {
    assert.ok(relocated.includes(name), name);
  }
});
