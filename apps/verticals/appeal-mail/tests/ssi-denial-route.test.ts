import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// TanStack Router treats files under src/routes as candidate routes. Keep
// tests in the package's tests/ directory so they execute under pnpm test
// without being interpreted as API endpoints during the donor build.
const routeDir = fileURLToPath(new URL("../src/routes/api/workflows/ssi-denial/", import.meta.url));
const actions = ["analyze", "draft", "approve", "checkout"] as const;

function routeSource(action: (typeof actions)[number]): string {
  return readFileSync(join(routeDir, `${action}.ts`), "utf8");
}

test("SSI denial tests are not inside TanStack's file-route tree", () => {
  const misplacedTests = readdirSync(routeDir).filter((name) => /\.test\.[cm]?[jt]sx?$/.test(name));
  assert.deepEqual(misplacedTests, [], "move route-adjacent tests into tests/ to avoid route generation warnings");
});

test("SSI denial declares all four API routes for SSI, not SSDI", () => {
  for (const action of actions) {
    const source = routeSource(action);
    assert.ok(
      source.includes(`createFileRoute("/api/workflows/ssi-denial/${action}")`),
      `${action} must register the SSI endpoint`,
    );
    assert.ok(
      !source.includes('createFileRoute("/api/workflows/ssdi-denial/'),
      `${action} must not register an SSDI endpoint`,
    );
  }
  assert.ok(routeSource("analyze").includes('getWorkflow("ssi-denial")'));
  assert.ok(routeSource("draft").includes('getWorkflow("ssi-denial")'));
});

test("SSI draft, approval and checkout guard case ownership and program identity", () => {
  for (const action of ["draft", "approve", "checkout"] as const) {
    const source = routeSource(action);
    assert.match(source, /\.user_id !== user\.id/, `${action} must check case ownership`);
    assert.ok(
      source.includes('workflow_id !== "ssi-denial"'),
      `${action} must reject a case from another workflow`,
    );
  }
  assert.ok(routeSource("checkout").includes('a.status !== "ready"'), "checkout must require prior approval");
});
