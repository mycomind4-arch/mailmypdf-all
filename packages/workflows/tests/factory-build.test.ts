import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewedFactoryTemplatePlan,
} from "../src/factory-build.js";

test("reviewed Records Request template produces bootstrap and deterministic materialization files", () => {
  const plan = buildReviewedFactoryTemplatePlan({
    id: "records-request/local-agency-records-request",
    label: "Local Agency Records Request",
    startTemplate: "records-request",
  });

  assert.equal(plan.canonicalId, "records-request/local-agency-records-request");
  assert.equal(plan.sectionId, "records-request");
  assert.equal(plan.slug, "local-agency-records-request");
  assert.equal(plan.spec.execution?.kind, "platform");
  assert.equal(plan.spec.execution?.policyFamily, "records-request");
  assert.deepEqual(
    plan.bootstrapFiles.map((file) => file.path),
    [
      "records-request/workflows/local-agency-records-request/workflow.spec.json",
      "records-request/workflows/local-agency-records-request/config.ts",
    ],
  );
  assert.match(plan.bootstrapFiles[1]!.content, /indexable: false/);
  assert.match(plan.bootstrapFiles[1]!.content, /contentStatus: "scaffold"/);
  assert.ok(
    plan.filePaths.includes(
      "mailmypdf/src/routes/records-request/workflows/local-agency-records-request/start/index.tsx",
    ),
  );
});

test("autonomous new-template builds reject unsupported families and unsafe ids", () => {
  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "notice-respond/state-tax-balance-response",
        label: "State Tax Balance Notice Response",
        startTemplate: "notice-response" as never,
      }),
    /records-request only/,
  );

  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "records-request/local-agency",
        label: "Local Agency Records Request",
        startTemplate: "records-request",
      }),
    /must use records-request\/.*-records-request/,
  );
});
