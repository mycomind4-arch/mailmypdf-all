import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* ═══════════════════════════════════════════════════════════
   Group E — Analyze/Certify Route Migration Regression Tests
   ═══════════════════════════════════════════════════════════ */

const workflowsDir = "src/routes/api/workflows";

const workflowSlugs = readdirSync(workflowsDir).filter(
  (entry) => statSync(join(workflowsDir, entry)).isDirectory()
);

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

const ANALYZE_SLUGS = workflowSlugs.filter((slug) => {
  if (slug === "$workflowId") return false;
  try { read(join(workflowsDir, slug, "analyze.ts")); return true; } catch { return false; }
});

const CERTIFY_SLUGS = workflowSlugs.filter((slug) => {
  if (slug === "$workflowId") return false;
  try { read(join(workflowsDir, slug, "certify.ts")); return true; } catch { return false; }
});

describe("Group E: analyze.ts migration", () => {
  for (const slug of ANALYZE_SLUGS) {
    const source = read(join(workflowsDir, slug, "analyze.ts"));

    test(`${slug}/analyze.ts uses createFileRoute from @tanstack/react-router`, () => {
      assert.match(source, /import \{ createFileRoute \} from "@tanstack\/react-router"/);
      assert.doesNotMatch(source, /createAPIFileRoute/);
    });

    test(`${slug}/analyze.ts exports Route (not APIRoute)`, () => {
      assert.match(source, /export const Route\s*=\s*createFileRoute\(/);
      assert.doesNotMatch(source, /export const APIRoute/);
    });

    test(`${slug}/analyze.ts uses server.handlers wrapper`, () => {
      assert.match(source, /server:\s*\{[\s\S]*handlers:\s*\{/);
    });

    test(`${slug}/analyze.ts preserves request.formData()`, () => {
      assert.match(source, /request\.formData\(\)/);
    });

    test(`${slug}/analyze.ts preserves auth guard`, () => {
      assert.match(source, /requireAuthenticatedUser/);
    });

    test(`${slug}/analyze.ts preserves file validation (File check)`, () => {
      assert.match(source, /instanceof File/);
    });

    test(`${slug}/analyze.ts preserves file size limit`, () => {
      assert.match(source, /file\.size/);
    });

    test(`${slug}/analyze.ts preserves MIME validation`, () => {
      assert.match(source, /application\/pdf/);
      assert.match(source, /image\//);
    });

    test(`${slug}/analyze.ts preserves arrayBuffer for base64`, () => {
      assert.match(source, /\.arrayBuffer\(\)/);
    });

    test(`${slug}/analyze.ts preserves Supabase persistence`, () => {
      assert.match(source, /getSupabaseServer/);
    });
  }
});

describe("Group E: certify.ts migration", () => {
  for (const slug of CERTIFY_SLUGS) {
    const source = read(join(workflowsDir, slug, "certify.ts"));

    test(`${slug}/certify.ts uses createFileRoute from @tanstack/react-router`, () => {
      assert.match(source, /import \{ createFileRoute \} from "@tanstack\/react-router"/);
      assert.doesNotMatch(source, /createAPIFileRoute/);
    });

    test(`${slug}/certify.ts exports Route (not APIRoute)`, () => {
      assert.match(source, /export const Route\s*=\s*createFileRoute\(/);
      assert.doesNotMatch(source, /export const APIRoute/);
    });

    test(`${slug}/certify.ts uses server.handlers wrapper`, () => {
      assert.match(source, /server:\s*\{[\s\S]*handlers:\s*\{/);
    });
  }
});

describe("Group E: zero createAPIFileRoute in all API routes", () => {
  test("no API route file contains createAPIFileRoute", () => {
    const apiDir = "src/routes/api";
    const files: string[] = [];

    function scan(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) scan(full);
        else if (entry.endsWith(".ts")) files.push(full);
      }
    }
    scan(apiDir);

    const offenders = files.filter((f) => read(f).includes("createAPIFileRoute"));
    assert.deepEqual(offenders, [], `Files still using createAPIFileRoute: ${offenders.join(", ")}`);
  });
});

describe("Group E: routeTree includes all analyze routes", () => {
  const tree = read("src/routeTree.gen.ts");

  for (const slug of ANALYZE_SLUGS) {
    test(`routeTree contains /api/workflows/${slug}/analyze`, () => {
      assert.match(tree, new RegExp(`/api/workflows/${slug.replace(/\$/g, "\\$")}/analyze`));
    });
  }

  for (const slug of CERTIFY_SLUGS) {
    test(`routeTree contains /api/workflows/${slug}/certify`, () => {
      assert.match(tree, new RegExp(`/api/workflows/${slug.replace(/\$/g, "\\$")}/certify`));
    });
  }
});
