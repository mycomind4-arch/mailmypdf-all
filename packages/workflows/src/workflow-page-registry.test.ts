import assert from "node:assert/strict";
import test from "node:test";
import { RESERVED_WORKFLOW_AUTHORITY_PAGES } from "./workflow-reserved-pages.js";
import { WORKFLOW_AUTHORITY_PAGES } from "./workflow-page-registry.js";

test("workflow authority page paths are unique across current and reserved catalogs", () => {
  const pages = [...WORKFLOW_AUTHORITY_PAGES, ...RESERVED_WORKFLOW_AUTHORITY_PAGES];
  const paths = pages.map((page) => page.canonicalPath);
  assert.equal(new Set(paths).size, paths.length);
});

test("all reserved workflow pages remain placeholders and canonical to MailMyPDF paths", () => {
  for (const page of RESERVED_WORKFLOW_AUTHORITY_PAGES) {
    assert.equal(page.maturity, "placeholder");
    assert.match(page.canonicalPath, /^\/[a-z0-9-]+(\/[a-z0-9-]+)+$/);
    assert.ok(page.primaryIntent.length > 0);
  }
});
