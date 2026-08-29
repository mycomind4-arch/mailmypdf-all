import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(process.cwd());
const file = (p: string) => resolve(root, p);
const read = (p: string) => readFileSync(file(p), "utf8");
const ROUTE_TREE = join(root, "src", "routeTree.gen.ts");

describe("Dynamic $workflowId API routes — Phase 2B regression", () => {
  /* ── analyze.ts route file ────────────────────────────── */

  describe("analyze.ts route file", () => {
    const source = read("src/routes/api/workflows/$workflowId/analyze.ts");

    test("exports Route (not APIRoute)", () => {
      assert.match(source, /export const Route\b/);
      assert.doesNotMatch(source, /export const APIRoute\b/);
    });

    test("uses createFileRoute from @tanstack/react-router", () => {
      assert.match(source, /import \{ createFileRoute \} from "@tanstack\/react-router"/);
      assert.doesNotMatch(source, /createAPIFileRoute/);
    });

    test("registers the correct dynamic path", () => {
      assert.match(source, /createFileRoute\("\/api\/workflows\/\$workflowId\/analyze"\)/);
    });

    test("uses server.handlers pattern", () => {
      assert.match(source, /server:\s*\{[\s\S]*handlers:\s*\{[\s\S]*POST:/);
    });

    test("handler destructures params from context", () => {
      assert.match(source, /POST:\s*async\s*\(\s*\{[^}]*params[^}]*\}/);
    });

    test("handler accesses params.workflowId", () => {
      assert.match(source, /params\.workflowId/);
    });

    test("preserves requireAuthenticatedUser", () => {
      assert.match(source, /requireAuthenticatedUser\(request\)/);
    });

    test("preserves getWorkflow call", () => {
      assert.match(source, /getWorkflow\(params\.workflowId\)/);
    });

    test("preserves file upload / formData handling", () => {
      assert.match(source, /request\.formData\(\)/);
      assert.match(source, /uploadDocument\(file\)/);
    });

    test("preserves 20 MB size limit", () => {
      assert.match(source, /20\s*\*\s*1024\s*\*\s*1024/);
    });

    test("preserves Gemini / control-plane integration", () => {
      assert.match(source, /api\/control-plane\/ai/);
      assert.match(source, /generateContent/);
    });

    test("auth check precedes workflow parameter processing", () => {
      const authIdx = source.indexOf("requireAuthenticatedUser(request)");
      const workflowIdx = source.indexOf("getWorkflow(params.workflowId)");
      assert.ok(authIdx > -1, "requireAuthenticatedUser must be present");
      assert.ok(workflowIdx > -1, "getWorkflow(params.workflowId) must be present");
      assert.ok(authIdx < workflowIdx, "auth must precede getWorkflow");
    });

    test("error responses use appropriate status codes", () => {
      assert.match(source, /status:\s*400/);
      assert.match(source, /\? 401/);
      assert.match(source, /status:\s*413/);
      assert.match(source, /: 502/);
    });
  });

  /* ── draft.ts route file ──────────────────────────────── */

  describe("draft.ts route file", () => {
    const source = read("src/routes/api/workflows/$workflowId/draft.ts");

    test("exports Route (not APIRoute)", () => {
      assert.match(source, /export const Route\b/);
      assert.doesNotMatch(source, /export const APIRoute\b/);
    });

    test("uses createFileRoute from @tanstack/react-router", () => {
      assert.match(source, /import \{ createFileRoute \} from "@tanstack\/react-router"/);
      assert.doesNotMatch(source, /createAPIFileRoute/);
    });

    test("registers the correct dynamic path", () => {
      assert.match(source, /createFileRoute\("\/api\/workflows\/\$workflowId\/draft"\)/);
    });

    test("uses server.handlers pattern", () => {
      assert.match(source, /server:\s*\{[\s\S]*handlers:\s*\{[\s\S]*POST:/);
    });

    test("handler destructures params from context", () => {
      assert.match(source, /POST:\s*async\s*\(\s*\{[^}]*params[^}]*\}/);
    });

    test("handler accesses params.workflowId", () => {
      assert.match(source, /params\.workflowId/);
    });

    test("preserves requireAuthenticatedUser", () => {
      assert.match(source, /requireAuthenticatedUser\(request\)/);
    });

    test("preserves getWorkflow call", () => {
      assert.match(source, /getWorkflow\(params\.workflowId\)/);
    });

    test("preserves JSON body parsing", () => {
      assert.match(source, /request\.json\(\)/);
    });

    test("preserves draft + validation Gemini calls", () => {
      assert.match(source, /resolveGemini\("draft"\)/);
      assert.match(source, /resolveGemini\("validation"\)/);
    });

    test("preserves validation response shape", () => {
      assert.match(source, /unsupportedClaims/);
      assert.match(source, /missingEvidence/);
    });

    test("auth check precedes workflow parameter processing", () => {
      const authIdx = source.indexOf("requireAuthenticatedUser(request)");
      const workflowIdx = source.indexOf("getWorkflow(params.workflowId)");
      assert.ok(authIdx > -1, "requireAuthenticatedUser must be present");
      assert.ok(workflowIdx > -1, "getWorkflow(params.workflowId) must be present");
      assert.ok(authIdx < workflowIdx, "auth must precede getWorkflow");
    });
  });

  /* ── Route tree integration ───────────────────────────── */

  describe("routeTree.gen.ts integration", () => {
    const tree = read(ROUTE_TREE);

    test("contains import for $workflowId/analyze route", () => {
      assert.match(tree, /ApiWorkflowsWorkflowIdAnalyzeRouteImport/);
    });

    test("contains import for $workflowId/draft route", () => {
      assert.match(tree, /ApiWorkflowsWorkflowIdDraftRouteImport/);
    });

    test("contains route nodes for both dynamic routes", () => {
      assert.match(tree, /id:\s*'\/api\/workflows\/\$workflowId\/analyze'/);
      assert.match(tree, /id:\s*'\/api\/workflows\/\$workflowId\/draft'/);
    });

    test("zero createAPIFileRoute references in Group C files", () => {
      const analyze = read("src/routes/api/workflows/$workflowId/analyze.ts");
      const draft = read("src/routes/api/workflows/$workflowId/draft.ts");
      assert.doesNotMatch(analyze, /createAPIFileRoute/);
      assert.doesNotMatch(draft, /createAPIFileRoute/);
    });
  });

  /* ── Security ────────────────────────────────────────── */

  describe("security — no embedded secrets", () => {
    const analyze = read("src/routes/api/workflows/$workflowId/analyze.ts");
    const draft = read("src/routes/api/workflows/$workflowId/draft.ts");

    test("no SUPABASE_SERVICE_ROLE_KEY values", () => {
      assert.doesNotMatch(analyze, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`][^"'`]+/);
      assert.doesNotMatch(draft, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`][^"'`]+/);
    });

    test("no JWT tokens", () => {
      assert.doesNotMatch(analyze, /eyJ[A-Za-z0-9_-]+\.eyJ/);
      assert.doesNotMatch(draft, /eyJ[A-Za-z0-9_-]+\.eyJ/);
    });
  });
});
