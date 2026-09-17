import assert from "node:assert/strict";
import test from "node:test";
import {
  BENEFITS_APPEAL_WORKFLOWS,
  getBenefitsWorkflowLaunchPath,
  getBenefitsWorkflowEntry,
} from "../../benefits-appeal/workflows/registry.ts";

test("Benefits Appeal registry covers every section workflow exactly once", () => {
  assert.equal(BENEFITS_APPEAL_WORKFLOWS.length, 30);
  const ids = BENEFITS_APPEAL_WORKFLOWS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("only executable Benefits front doors expose canonical launch routes", () => {
  assert.equal(
    getBenefitsWorkflowLaunchPath("ssdi-denial-appeal"),
    "/appeal-mail/workflows/appeal-ssdi-denial/start",
  );
  assert.equal(
    getBenefitsWorkflowLaunchPath("ssdi-reconsideration"),
    "/appeal-mail/workflows/appeal-ssdi-denial/start",
  );
  assert.equal(getBenefitsWorkflowLaunchPath("ssi-denial-appeal"), null);
  assert.equal(getBenefitsWorkflowLaunchPath("medicaid-denial-appeal"), null);
});

test("canonical scaffold mappings remain discoverable without being launchable", () => {
  const medicaid = getBenefitsWorkflowEntry("medicaid-denial-appeal");
  assert.equal(medicaid?.maturity, "canonical-scaffold");
  assert.equal(medicaid?.canonical?.workflowId, "appeal-medicaid-denial");

  const unemployment = getBenefitsWorkflowEntry("unemployment-denial-appeal");
  assert.equal(unemployment?.maturity, "canonical-scaffold");
  assert.equal(unemployment?.canonical?.workflowId, "appeal-unemployment-denial");
});
