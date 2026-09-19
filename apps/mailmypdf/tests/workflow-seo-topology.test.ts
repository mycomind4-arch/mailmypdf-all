import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowSeoTopology } from "../src/lib/workflow-seo-topology";
import { SEO_WORKFLOW_CATALOG, type WorkflowSeoCatalogEntry } from "../src/lib/workflow-seo-catalog";

function draft(id: string, route: string): WorkflowSeoCatalogEntry {
  return {
    id,
    vertical: "notice",
    route,
    state: "DRAFT",
    reviewStatus: "NEEDS_INDIVIDUAL_REVIEW",
    provenance: [
      {
        kind: "build-spec",
        sourcePath: "build-specs/test.md",
        note: "Test fixture representing source extraction only.",
      },
    ],
  };
}

test("unique draft ids and routes are valid catalog topology", () => {
  const issues = validateWorkflowSeoTopology([
    draft("notice/example-one", "/notice/example-one"),
    draft("notice/example-two", "/notice/example-two"),
  ]);
  assert.deepEqual(issues, []);
});

test("duplicate ids and routes fail even while content is DRAFT", () => {
  const issues = validateWorkflowSeoTopology([
    draft("notice/example", "/notice/example"),
    draft("notice/example", "/notice/example"),
  ]);
  assert.ok(issues.some((issue) => issue.code === "DUPLICATE_ID"));
  assert.ok(issues.some((issue) => issue.code === "DUPLICATE_ROUTE"));
});

test("a new SEO node cannot silently steal a legacy modeled route", () => {
  const issues = validateWorkflowSeoTopology(
    [draft("notice/new-owner", "/notice/existing")],
    [{ id: "notice/existing-owner", route: "/notice/existing" }],
  );
  assert.ok(issues.some((issue) => issue.code === "ROUTE_COLLISION"));
});

test("changing the route for the same modeled id requires an explicit migration", () => {
  const issues = validateWorkflowSeoTopology(
    [draft("notice/example", "/notice/new-example")],
    [{ id: "notice/example", route: "/notice/old-example" }],
  );
  assert.ok(issues.some((issue) => issue.code === "ROUTE_COLLISION"));
});

test("SEO_READY cannot bypass the individual authority review boundary", () => {
  const entry = {
    ...draft("notice/review-boundary", "/notice/review-boundary"),
    state: "SEO_READY" as const,
  };
  const issues = validateWorkflowSeoTopology([entry]);
  assert.ok(issues.some((issue) => issue.code === "REVIEW_REQUIRED"));
});

test("catalog records require source provenance", () => {
  const entry = {
    ...draft("notice/no-source", "/notice/no-source"),
    provenance: [],
  };
  const issues = validateWorkflowSeoTopology([entry]);
  assert.ok(issues.some((issue) => issue.code === "PROVENANCE_REQUIRED"));
});

test("Secured Transactions contributes 17 review-gated topology records with only eligibility executable", () => {
  const secured = SEO_WORKFLOW_CATALOG.filter((entry) => entry.vertical === "secured-transactions");
  assert.equal(secured.length, 17);
  assert.equal(new Set(secured.map((entry) => entry.id)).size, 17);
  assert.equal(new Set(secured.map((entry) => entry.route)).size, 17);

  const executable = secured.filter((entry) => entry.state === "EXECUTABLE");
  assert.equal(executable.length, 1);
  assert.equal(executable[0]?.id, "secured-transactions/secured-transaction-eligibility");
  assert.equal(executable[0]?.execution?.verified, true);

  for (const entry of secured) {
    assert.equal(entry.reviewStatus, "NEEDS_INDIVIDUAL_REVIEW");
    assert.ok(entry.provenance?.length);
  }
});

