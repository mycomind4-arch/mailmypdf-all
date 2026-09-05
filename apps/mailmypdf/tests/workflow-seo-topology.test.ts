import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowSeoTopology } from "../src/lib/workflow-seo-topology";
import type { WorkflowSeoCatalogEntry } from "../src/lib/workflow-seo-catalog";

function draft(id: string, route: string): WorkflowSeoCatalogEntry {
  return { id, vertical: "notice", route, state: "DRAFT" };
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
