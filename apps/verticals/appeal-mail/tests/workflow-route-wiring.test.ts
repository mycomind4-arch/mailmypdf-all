import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

/* ═══════════════════════════════════════════════════════════
   Workflow Route Wiring

   /workflows/ssdi-denial rendered <SsiDenialWorkspace />, which
   posts to /api/workflows/ssi-denial/*. SSDI and SSI are separate
   programs with different eligibility findings and evidence
   standards, so claimants on the SSDI page were analyzed and
   drafted against the wrong one.

   A route may render either its own named workspace or the shared
   AppealWorkflowWorkspace with an explicit workflowId. It may never
   render a different workflow's dedicated workspace.
   ═══════════════════════════════════════════════════════════ */

const ROOT = join(import.meta.dirname, "..");
const ROUTES = join(ROOT, "src", "routes", "workflows");

function pascal(slug: string): string {
  return slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

const routeFiles = readdirSync(ROUTES)
  .filter((f) => f.endsWith(".tsx") && f !== "index.tsx")
  .map((f) => ({ slug: basename(f, ".tsx"), path: join(ROUTES, f) }));

describe("Workflow route wiring", () => {
  test("route files were discovered", () => {
    assert.ok(routeFiles.length > 0, "expected workflow route files under src/routes/workflows");
  });

  for (const { slug, path } of routeFiles) {
    test(`/workflows/${slug} renders its own workflow`, () => {
      const body = readFileSync(path, "utf-8");
      const rendered = [...body.matchAll(/<([A-Za-z0-9]+Workspace)\b/g)].map((m) => m[1]);
      if (rendered.length === 0) return; // informational route, no workspace

      const expected = `${pascal(slug)}Workspace`;
      for (const component of rendered) {
        if (component === "AppealWorkflowWorkspace") {
          const id = body.match(/<AppealWorkflowWorkspace[^>]*workflowId=["']([a-z0-9-]+)["']/);
          assert.ok(id, `${slug}: AppealWorkflowWorkspace must be given an explicit workflowId`);
          assert.equal(
            id![1],
            slug,
            `${slug}: shared workspace is wired to workflowId "${id![1]}" instead of "${slug}"`,
          );
          continue;
        }
        assert.equal(
          component,
          expected,
          `/workflows/${slug} renders <${component} /> instead of <${expected} />; ` +
            `it would send claimants through another workflow's analyze/draft endpoints`,
        );
      }
    });
  }

  test("SSDI denial does not touch the SSI pipeline", () => {
    const body = readFileSync(join(ROUTES, "ssdi-denial.tsx"), "utf-8");
    assert.equal(body.includes("SsiDenialWorkspace"), false, "SSDI route must not render the SSI workspace");
    assert.equal(body.includes("ssi-denial"), false, "SSDI route must not reference SSI endpoints or components");
  });

  test("the SSDI workspace posts only to SSDI endpoints", () => {
    const body = readFileSync(join(ROOT, "src", "components", "workflow", "ssdi-denial-workspace.tsx"), "utf-8");
    const endpoints = [...body.matchAll(/\/api\/workflows\/([a-z0-9-]+)\//g)].map((m) => m[1]);
    assert.ok(endpoints.length > 0, "expected the SSDI workspace to call workflow endpoints");
    for (const workflow of new Set(endpoints)) {
      assert.equal(workflow, "ssdi-denial", `SSDI workspace calls /api/workflows/${workflow}/*`);
    }
  });
});
