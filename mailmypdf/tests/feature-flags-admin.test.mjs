import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("admin flag list reads actual gate values, not mere function presence", async () => {
  const code = await readFile(new URL("../src/lib/feature-flags.ts", import.meta.url), "utf8");
  const start = code.indexOf("getAllFlags():");
  const end = code.indexOf("toObject():", start);
  assert.ok(start >= 0 && end > start);
  const list = code.slice(start, end);
  assert.match(list, /const current = this\.toObject\(\)/);
  assert.match(list, /value: current\[name\] \?\? false/);
  assert.doesNotMatch(list, /this\[`is\$\{name/);
});
