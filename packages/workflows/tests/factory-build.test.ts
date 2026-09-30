import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewedFactoryTemplatePlan,
} from "../src/factory-build.js";

test("reviewed notice-response template produces a deterministic materialization plan", () => {
  const plan = buildReviewedFactoryTemplatePlan({
    id: "notice-respond/state-tax-balance-response",
    label: "State Tax Balance Notice Response",
    startTemplate: "notice-response",
  });

  assert.equal(plan.canonicalId, "notice-respond/state-tax-balance-response");
  assert.equal(plan.sectionId, "notice-respond");
  assert.equal(plan.slug, "state-tax-balance-response");
  assert.equal(plan.spec.execution?.kind, "platform");
  assert.equal(plan.spec.execution?.policyFamily, "notice-response");
  assert.deepEqual(plan.filePaths, [
    "notice-respond/workflows/state-tax-balance-response/index.tsx",
    "notice-respond/workflows/state-tax-balance-response/seo.ts",
    "notice-respond/workflows/state-tax-balance-response/schema.ts",
    "mailmypdf/src/routes/notice-respond/workflows/state-tax-balance-response/index.tsx",
    "notice-respond/workflows/state-tax-balance-response/start/index.tsx",
    "mailmypdf/src/routes/notice-respond/workflows/state-tax-balance-response/start/index.tsx",
  ]);
});

test("reviewed build plan rejects section and family drift", () => {
  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "notice-respond/public-records-request",
        label: "Public Records Request",
        startTemplate: "records-request",
      }),
    /requires records-request/,
  );
});
