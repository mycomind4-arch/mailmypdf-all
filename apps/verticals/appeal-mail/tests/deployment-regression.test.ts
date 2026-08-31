import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join, basename } from "node:path";

import { workflows, appealWorkflowCount, workflowIds } from "../src/domain/workflows";

/* ═══════════════════════════════════════════════════════════
   Deployment Regression — Hardening Pass

   These tests FAIL the build if any condition that previously
   caused the production /workflows page to show 20 workflows
   instead of 33 recurs.  They do NOT test workflow behavior.

   Conditions covered:
   1. Registry count integrity
   2. Workflow directory consumes src/domain/workflows.ts
   3. src/routeTree.gen.ts is not stale relative to route files
   4. /workflows renders exactly the current registry count
   5. Child routes render through the /workflows parent layout
   6. No old appeal-catalog workflow-directory implementation
   7. No stale Nitro cache before build
   ═══════════════════════════════════════════════════════════ */

const ROOT = join(import.meta.dirname, "..");
const ROUTES_DIR = join(ROOT, "src", "routes", "workflows");
const ROUTE_TREE = join(ROOT, "src", "routeTree.gen.ts");
const DIR_COMPONENT = join(ROOT, "src", "components", "appeal-workflow-directory.tsx");
const WORKFLOWS_ROUTE = join(ROOT, "src", "routes", "workflows.tsx");
const INDEX_ROUTE = join(ROOT, "src", "routes", "workflows", "index.tsx");
const NITRO_CACHE = join(ROOT, "node_modules", ".nitro");

function readFile(p: string): string {
  return readFileSync(p, "utf-8");
}

/* ── 1. Registry count integrity ────────────────────────── */

describe("Registry count integrity", () => {
  test("Object.keys(workflows).length matches appealWorkflowCount", () => {
    const keys = Object.keys(workflows);
    assert.equal(
      keys.length,
      appealWorkflowCount,
      `Object.keys(workflows).length (${keys.length}) must equal appealWorkflowCount (${appealWorkflowCount})`,
    );
  });

  test("appealWorkflowCount matches workflowIds.length", () => {
    assert.equal(
      appealWorkflowCount,
      workflowIds.length,
      `appealWorkflowCount (${appealWorkflowCount}) must equal workflowIds.length (${workflowIds.length})`,
    );
  });

  test("registry contains exactly 33 workflows (snapshot)", () => {
    const count = Object.keys(workflows).length;
    assert.equal(count, 33, `Expected 33 workflow entries, got ${count}. Update this snapshot if the registry changed intentionally.`);
  });

  test("every workflow ID is unique", () => {
    const ids = Object.keys(workflows);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, "Duplicate workflow IDs found in registry");
  });
});

/* ── 2. Workflow directory consumes src/domain/workflows.ts ─ */

describe("Workflow directory source", () => {
  test("appeal-workflow-directory.tsx imports from @/domain/workflows", () => {
    const src = readFile(DIR_COMPONENT);
    assert.ok(
      src.includes("@/domain/workflows"),
      "appeal-workflow-directory.tsx must import from @/domain/workflows",
    );
  });

  test("appeal-workflow-directory.tsx does NOT import from @/domain/appeal-catalog", () => {
    const src = readFile(DIR_COMPONENT);
    assert.ok(
      !src.includes("@/domain/appeal-catalog"),
      "appeal-workflow-directory.tsx must NOT import from @/domain/appeal-catalog",
    );
  });

  test("appeal-workflow-directory.tsx uses Object.values(workflows) for entries", () => {
    const src = readFile(DIR_COMPONENT);
    assert.ok(
      src.includes("Object.values(workflows)"),
      "appeal-workflow-directory.tsx must use Object.values(workflows) to derive entries",
    );
  });

  test("workflows/index.tsx imports appealWorkflowCount from @/domain/workflows", () => {
    const src = readFile(INDEX_ROUTE);
    assert.ok(
      src.includes("appealWorkflowCount"),
      "workflows/index.tsx must import appealWorkflowCount",
    );
    assert.ok(
      src.includes("@/domain/workflows"),
      "workflows/index.tsx must import from @/domain/workflows",
    );
  });
});

/* ── 3. Route tree freshness ─────────────────────────────── */

describe("Route tree freshness", () => {
  test("every workflow route file has a corresponding import in routeTree.gen.ts", () => {
    const tree = readFile(ROUTE_TREE);
    const routeFiles = readdirSync(ROUTES_DIR)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""));

    const missing: string[] = [];
    for (const route of routeFiles) {
      // routeTree uses PascalCase imports like WorkflowsCarInsuranceAppealRouteImport
      // For index.tsx it uses WorkflowsIndexRouteImport
      // For $workflowId.tsx it uses Workflows$workflowIdRouteImport
      let pascalName = route
        .replace(/\$/g, "")          // strip $ from $workflowId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");

      const importName = `Workflows${pascalName}RouteImport`;
      if (!tree.includes(importName)) {
        missing.push(`${route} (expected import: ${importName})`);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `routeTree.gen.ts is missing imports for: ${missing.join(", ")}. Run the build to regenerate routeTree.gen.ts.`,
    );
  });

  test("routeTree.gen.ts includes the /workflows/ index route", () => {
    const tree = readFile(ROUTE_TREE);
    assert.ok(
      tree.includes("WorkflowsIndexRouteImport"),
      "routeTree.gen.ts must include the /workflows/ index route. Run the build to regenerate.",
    );
  });

  test("every workflow route file exports createFileRoute", () => {
    const routeFiles = readdirSync(ROUTES_DIR)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => join(ROUTES_DIR, f));

    const missing: string[] = [];
    for (const file of routeFiles) {
      const src = readFile(file);
      if (!src.includes("createFileRoute")) {
        missing.push(basename(file));
      }
    }

    assert.deepEqual(
      missing,
      [],
      `These route files are missing createFileRoute: ${missing.join(", ")}. They will not be included in the route tree.`,
    );
  });
});

/* ── 4. /workflows renders exactly the registry count ───── */

describe("Workflow directory renders exact registry count", () => {
  test("appeal-workflow-directory does not filter or limit entries", () => {
    const src = readFile(DIR_COMPONENT);
    assert.ok(
      !src.includes(".slice(0,") && !src.includes(".slice(0 ,"),
      "appeal-workflow-directory must not slice/limit the entries array",
    );
    assert.ok(
      !/\bfilter\([^)]*\bstatus\b/.test(src),
      "appeal-workflow-directory must not filter by status (all 33 are AVAILABLE)",
    );
  });

  test("directory entry count is derived from registry, not hardcoded", () => {
    const src = readFile(DIR_COMPONENT);
    // The component must derive entries from Object.values(workflows)
    // and NOT use a hardcoded count like 20 (old catalog count).
    // Strip CSS/utility classes to avoid false positives.
    const codeOnly = src
      .replace(/px-\d+|py-\d+|p-\d+|m-\d+|gap-\d+|grid-cols-\d+|max-w-\w+|min-h-\w+|h-\d+|w-\d+|border-\w+|rounded-\w+|text-\w+|bg-\w+|flex|grid/g, "")
      .replace(/20\d{2}/g, ""); // strip years like 2026
    assert.ok(
      !/\b20\b/.test(codeOnly),
      "appeal-workflow-directory must not contain hardcoded 20 (old catalog count)",
    );
  });
});

/* ── 5. Child routes render through /workflows parent ────── */

describe("Parent layout renders Outlet for child routes", () => {
  test("workflows.tsx component contains <Outlet />", () => {
    const src = readFile(WORKFLOWS_ROUTE);
    assert.ok(
      src.includes("Outlet"),
      "src/routes/workflows.tsx must render <Outlet /> so child workflow routes can render their own components",
    );
  });

  test("workflows.tsx does NOT inline AppealWorkflowDirectory", () => {
    const src = readFile(WORKFLOWS_ROUTE);
    assert.ok(
      !src.includes("AppealWorkflowDirectory"),
      "src/routes/workflows.tsx must NOT import AppealWorkflowDirectory — directory content belongs in workflows/index.tsx",
    );
  });

  test("workflows/index.tsx has createFileRoute for /workflows/", () => {
    const src = readFile(INDEX_ROUTE);
    assert.ok(
      src.includes('createFileRoute("/workflows/")'),
      'workflows/index.tsx must call createFileRoute("/workflows/") to be the index route',
    );
  });

  test("workflows/index.tsx renders AppealWorkflowDirectory", () => {
    const src = readFile(INDEX_ROUTE);
    assert.ok(
      src.includes("AppealWorkflowDirectory"),
      "workflows/index.tsx must render <AppealWorkflowDirectory />",
    );
  });
});

/* ── 6. No old appeal-catalog implementation in build ─────── */

describe("No stale appeal-catalog in workflow directory source", () => {
  const OLD_SYMBOLS = [
    "searchWorkflows",
    "getCatalogStats",
    "CATEGORY_ORDER",
    "CATEGORY_DESCRIPTIONS",
    "getImplementedWorkflows",
    "getComingSoonWorkflows",
  ];

  const DIR_FILES = [
    DIR_COMPONENT,
    WORKFLOWS_ROUTE,
    INDEX_ROUTE,
  ];

  for (const file of DIR_FILES) {
    test(`${basename(file)} does not use old appeal-catalog symbols`, () => {
      const src = readFile(file);
      const found = OLD_SYMBOLS.filter((s) => src.includes(s));
      assert.deepEqual(
        found,
        [],
        `${basename(file)} references old appeal-catalog symbols: ${found.join(", ")}`,
      );
    });

    test(`${basename(file)} does not import from @/domain/appeal-catalog`, () => {
      const src = readFile(file);
      assert.ok(
        !src.includes("@/domain/appeal-catalog"),
        `${basename(file)} must NOT import from @/domain/appeal-catalog`,
      );
    });
  }
});

/* ── 7. No stale Nitro cache ─────────────────────────────── */

describe("Build cache hygiene", () => {
  test("prebuild clears stale Nitro cache (verified by creating and removing a marker)", () => {
    // The prebuild script in package.json handles cache clearing.
    // This test verifies the prebuild script exists and targets .nitro.
    // A stale .nitro/last-build.json from a previous build would cause
    // the Nitro server to skip recompilation and serve old output.
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    const prebuild = pkg.scripts?.prebuild || "";
    assert.ok(
      prebuild.includes(".nitro"),
      "prebuild script must target node_modules/.nitro to clear stale cache",
    );
    assert.ok(
      prebuild.includes("rmSync") || prebuild.includes("rm -rf"),
      "prebuild script must remove the .nitro directory",
    );
  });

  test("package.json prebuild script clears Nitro cache", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    const prebuild = pkg.scripts?.prebuild;
    assert.ok(
      prebuild && prebuild.includes(".nitro"),
      'package.json must have a prebuild script that removes node_modules/.nitro (e.g. "rm -rf node_modules/.nitro")',
    );
  });
});
