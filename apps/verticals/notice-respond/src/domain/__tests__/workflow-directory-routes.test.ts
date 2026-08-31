import test from "node:test";
import assert from "node:assert/strict";
import { noticeRespondCatalog } from "../workflow-catalog";
import { NOTICE_WORKFLOWS } from "../../components/notice-workflow-directory-fixed";

test("every directory workflow uses its canonical executable route", () => {
  const catalogById = new Map(noticeRespondCatalog.map((workflow) => [workflow.id, workflow]));
  const routes = NOTICE_WORKFLOWS.map((workflow) => workflow.route);

  assert.ok(NOTICE_WORKFLOWS.length > 0, "expected workflows in the directory");
  assert.equal(new Set(routes).size, routes.length, "directory routes must be unique");

  for (const workflow of NOTICE_WORKFLOWS) {
    const definition = catalogById.get(workflow.slug);
    assert.ok(definition, `directory workflow ${workflow.slug} must exist in the catalog`);
    assert.equal(
      workflow.route,
      definition.searchIntent.canonicalPath,
      `directory workflow ${workflow.slug} must link to its canonical route`,
    );
  }
});
