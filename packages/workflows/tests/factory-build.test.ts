import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewedFactoryRepositoryPlan,
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

test("reviewed plans preserve Notice Response compatibility while autonomous repository execution stays Records Request only", () => {
  const notice = buildReviewedFactoryTemplatePlan({
    id: "notice-respond/state-tax-balance-response",
    label: "State Tax Balance Notice Response",
    startTemplate: "notice-response",
  });
  assert.equal(notice.spec.execution?.policyFamily, "notice-response");
  assert.equal(notice.bootstrapFiles.length, 0);

  assert.throws(
    () =>
      buildReviewedFactoryRepositoryPlan({
        id: "notice-respond/state-tax-balance-response",
        label: "State Tax Balance Notice Response",
        startTemplate: "notice-response",
      }),
    /repository materialization.*records-request only/i,
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


test("repository plan enrolls a new Records Request workflow without publishing scaffold copy", () => {
  const plan = buildReviewedFactoryRepositoryPlan({
    id: "records-request/city-contracts-records-request",
    label: "City Contracts Records Request",
    startTemplate: "records-request",
  }, [
    {
      id: "records-request/existing-records-request",
      label: "Existing Records Request",
    },
  ]);

  const registry = plan.files.find(
    (file) => file.path === "packages/workflows/src/canonical-workflows.json",
  );
  const inventory = plan.files.find(
    (file) => file.path === "mailmypdf/WORKFLOW_INVENTORY.json",
  );
  const config = plan.files.find(
    (file) => file.path.endsWith("/city-contracts-records-request/config.ts"),
  );

  assert.ok(registry);
  assert.match(registry.content, /city-contracts-records-request/);
  assert.ok(inventory);
  assert.match(inventory.content, /"total": 2/);
  assert.ok(config);
  assert.match(config.content, /indexable: false/);
  assert.match(config.content, /contentStatus: "scaffold"/);
});

test("repository plan refuses to overwrite an existing canonical workflow id", () => {
  assert.throws(
    () =>
      buildReviewedFactoryRepositoryPlan(
        {
          id: "records-request/city-contracts-records-request",
          label: "City Contracts Records Request",
          startTemplate: "records-request",
        },
        [
          {
            id: "records-request/city-contracts-records-request",
            label: "Existing",
          },
        ],
      ),
    /refuses existing canonical workflow/,
  );
});
