import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspace = readFileSync(join(import.meta.dirname, "..", "src", "components", "workflow", "appeal-workflow-workspace.tsx"), "utf8");

test("the shared workflow keeps public visitors in a full demo until they create an account", () => {
  assert.match(workspace, /if \(!user\) return <WorkflowDemo/);
  assert.match(workspace, /Interactive demo/);
  assert.match(workspace, /contractor-intake\.png/);
  assert.match(workspace, /contractor-mail\.png/);
  assert.match(workspace, /\/auth\?returnTo=/);
});

test("the demo uses the protected Contractor Dispute reference screenshots", () => {
  const images = workspace.match(/\/workflow-demo\/contractor-[a-z-]+\.png/g) ?? [];
  assert.equal(new Set(images).size, 8);
});
