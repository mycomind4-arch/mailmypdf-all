import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadScenario } from "@mailmypdf/workflow-acceptance";
import { EligibilityMatterAdapter } from "../../../workflows/secured-transaction-eligibility/start/matter-adapter";
import { InMemoryStepMatterRepository } from "../../../workflows/secured-transaction-eligibility/fixtures/in-memory-step-matter-repository";

const scenariosDir = dirname(fileURLToPath(import.meta.url));

/**
 * Exercises the full chain this manifest's acceptance scenarios describe:
 *
 *   authenticated user -> create owned matter -> persist intake ->
 *   reload intake -> runtime validation -> shared eligibility engine ->
 *   persist findings/readiness -> reload matter -> same result preserved
 *   -> terminal result
 *
 * through the real EligibilityMatterAdapter / StepMatterRepository
 * contract, not the shared engine called directly.
 */
async function runScenarioThroughRuntime(scenarioId: string) {
  const { scenario } = loadScenario(scenariosDir, scenarioId);
  const adapter = new EligibilityMatterAdapter(new InMemoryStepMatterRepository());
  const ownerId = "acceptance-owner";

  const created = await adapter.create(ownerId);
  const saved = await adapter.saveIntake({
    ownerId,
    matterId: created.id,
    expectedVersion: created.version,
    rawInput: scenario.intake,
  });

  const reloaded = await adapter.load(ownerId, created.id);
  assert.ok(reloaded, "matter did not reload");
  assert.deepEqual(
    reloaded.eligibility,
    saved.eligibility,
    "reloaded findings did not match the findings persisted at save time",
  );

  return reloaded.eligibility!.engineResult;
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

  test("unauthenticated access is rejected", async () => {
    const adapter = new EligibilityMatterAdapter(new InMemoryStepMatterRepository());
    await assert.rejects(() => adapter.create(""));
  });

  test("cross-user access cannot read another owner's matter", async () => {
    const adapter = new EligibilityMatterAdapter(new InMemoryStepMatterRepository());
    const created = await adapter.create("acceptance-owner");
    const asOtherUser = await adapter.load("intruder", created.id);
    assert.equal(asOtherUser, null);
  });

  test("cross-user access cannot mutate another owner's matter", async () => {
    const { scenario } = loadScenario(scenariosDir, "missing-basis-blocks");
    const adapter = new EligibilityMatterAdapter(new InMemoryStepMatterRepository());
    const created = await adapter.create("acceptance-owner");
    await assert.rejects(() =>
      adapter.saveIntake({
        ownerId: "intruder",
        matterId: created.id,
        expectedVersion: created.version,
        rawInput: scenario.intake,
      }),
    );
  });
});
