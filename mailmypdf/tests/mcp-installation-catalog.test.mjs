import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const smoke = readFileSync(fileURLToPath(new URL("../scripts/mcp-smoke.mjs", import.meta.url)), "utf8");
const guide = readFileSync(
  fileURLToPath(new URL("../../docs/integrations/mailmypdf-installation.md", import.meta.url)),
  "utf8",
);

test("MCP installation guide matches the smoke-check catalog contract", () => {
  const totalMatch = smoke.match(/if \(tools\.length !== (\d+)\)/);
  assert.ok(totalMatch, "smoke checker must explicitly validate the catalog size");
  const requiredBlock = smoke.match(/for \(const required of \[([\s\S]*?)\]\)/);
  assert.ok(requiredBlock, "smoke checker must enumerate required tool names");
  const requiredCount = [...requiredBlock[1].matchAll(/"([a-z][a-z0-9_]*)"/g)].length;
  const total = Number(totalMatch[1]);
  assert.ok(requiredCount > 0 && requiredCount <= total);
  assert.match(
    guide,
    new RegExp(`\\b${requiredCount} named tools\\b`),
    "installation guide must state how many tool names the smoke checker explicitly requires",
  );
  assert.match(
    guide,
    new RegExp(`\\b${total}-tool catalog\\b`),
    "installation guide must state the complete expected discovery catalog size",
  );
  assert.doesNotMatch(guide, /\b27-tool catalog\b|\ball 27 tools\b/);
});
