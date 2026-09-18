import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  loadScenario,
  InMemoryWorkflowRuntimeStore,
} from "@mailmypdf/workflow-acceptance";
import { evaluateSecuredTransactionEligibility } from "../../../workflows/secured-transaction-eligibility/rules/eligibility";
import { workflowRuntimePolicy } from "../../../workflows/secured-transaction-eligibility/runtime-policy";

const scenariosDir = dirname(fileURLToPath(import.meta.url));

/**
 * Exercises the full path this manifest's acceptance scenarios describe:
 *
 *   intake -> workflow adapter (runtime validation) -> shared eligibility
 *   engine -> findings/readiness -> terminal result
 *
 * not the shared engine called directly in isolation.
 */
async function runScenarioThroughRuntime(scenarioId: string) {
  const { scenario } = loadScenario(scenariosDir, scenarioId);

  const store = new InMemoryWorkflowRuntimeStore();
  const matter = await store.createMatter({
    ownerId: "acceptance-owner",
    workflowId: scenario.workflowId,
    verticalId: "secured-transactions",
    createdAt: "2026-09-18T00:00:00.000Z",
  });

  workflowRuntimePolicy.validateMatter({
    workflowId: scenario.workflowId,
    verticalId: "secured-transactions",
  });

  const validatedInput = workflowRuntimePolicy.validateInput(
    scenario.intake,
    null,
    { matter, documents: [] },
  );

  await store.saveInput("acceptance-owner", matter.id, validatedInput);
  const stored = await store.loadInput("acceptance-owner", matter.id);
  assert.ok(stored, "runtime store did not persist the validated input");

  return evaluateSecuredTransactionEligibility(stored.input);
}

describe("secured-transaction-eligibility acceptance", () => {
  test("missing-basis-blocks: a missing material fact prevents progression", async () => {
    const result = await runScenarioThroughRuntime("missing-basis-blocks");
    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("actual-obligation"));
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("conflict-remains-visible: contradictory material evidence remains explicit until reviewed", async () => {
    const result = await runScenarioThroughRuntime("conflict-remains-visible");
    assert.equal(result.status, "human-review-required");
    assert.ok(result.contradicted.includes("debtor-rights-in-collateral"));
    assert.equal(result.requiresHumanReview, true);
    assert.equal(result.canProceedToConsequentialAction, false);
  });
});
