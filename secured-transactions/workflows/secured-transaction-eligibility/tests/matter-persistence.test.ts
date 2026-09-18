import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EligibilityMatterAdapter } from "../start/matter-adapter";
import { InMemoryStepMatterRepository } from "../fixtures/in-memory-step-matter-repository";
import { allRequiredElementsVerified } from "../fixtures/all-required-elements-verified";
import { oneRequiredElementContradicted } from "../fixtures/one-required-element-contradicted";

function newAdapter() {
  return new EligibilityMatterAdapter(new InMemoryStepMatterRepository());
}

describe("secured-transaction-eligibility matter persistence and ownership", () => {
  test("authenticated owner can create a matter", async () => {
    const adapter = newAdapter();
    const matter = await adapter.create("owner-a");
    assert.equal(matter.ownerId, "owner-a");
    assert.equal(matter.workflowId, "secured-transaction-eligibility");
  });

  test("authenticated owner can save eligibility intake and reload the same matter", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");

    const { matter, eligibility } = await adapter.saveIntake({
      ownerId: "owner-a",
      matterId: created.id,
      expectedVersion: created.version,
      rawInput: allRequiredElementsVerified,
    });
    assert.equal(eligibility.engineResult.status, "ready-for-analysis");
    assert.equal(eligibility.engineResult.canProceedToConsequentialAction, false);

    const reloaded = await adapter.load("owner-a", matter.id);
    assert.ok(reloaded);
    assert.equal(reloaded.matter.version, matter.version);
    assert.equal(reloaded.eligibility?.engineResult.status, "ready-for-analysis");
    assert.deepEqual(reloaded.eligibility, eligibility);
  });

  test("unauthenticated request (empty owner id) is rejected", async () => {
    const adapter = newAdapter();
    await assert.rejects(() => adapter.create(""));
    await assert.rejects(() => adapter.load("", "matter-1"));
    await assert.rejects(() =>
      adapter.saveIntake({ ownerId: "", matterId: "matter-1", expectedVersion: 1, rawInput: {} }),
    );
  });

  test("a different user cannot read another owner's matter", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");
    const asOtherUser = await adapter.load("owner-b", created.id);
    assert.equal(asOtherUser, null);
  });

  test("a different user cannot mutate another owner's matter", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");
    await assert.rejects(
      () =>
        adapter.saveIntake({
          ownerId: "owner-b",
          matterId: created.id,
          expectedVersion: created.version,
          rawInput: allRequiredElementsVerified,
        }),
      /not accessible for this owner|Matter not found/,
    );

    const stillOwnedByOwnerA = await adapter.load("owner-a", created.id);
    assert.ok(stillOwnedByOwnerA);
    assert.equal(stillOwnedByOwnerA.eligibility, null);
  });

  test("malformed persisted input cannot silently become verified", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");
    await assert.rejects(() =>
      adapter.saveIntake({
        ownerId: "owner-a",
        matterId: created.id,
        expectedVersion: created.version,
        rawInput: { "identifiable-debtor": { status: "definitely-true" } },
      }),
    );
  });

  test("contradicted gate evidence persists as human-review-required and survives reload", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");
    await adapter.saveIntake({
      ownerId: "owner-a",
      matterId: created.id,
      expectedVersion: created.version,
      rawInput: oneRequiredElementContradicted,
    });

    const reloaded = await adapter.load("owner-a", created.id);
    assert.equal(reloaded?.eligibility?.engineResult.status, "human-review-required");
    assert.ok(reloaded?.eligibility?.engineResult.contradicted.includes("debtor-rights-in-collateral"));
    assert.equal(reloaded?.eligibility?.engineResult.requiresHumanReview, true);
    assert.equal(reloaded?.eligibility?.engineResult.canProceedToConsequentialAction, false);
  });

  test("stale expectedVersion is rejected rather than silently overwriting concurrent state", async () => {
    const adapter = newAdapter();
    const created = await adapter.create("owner-a");
    await adapter.saveIntake({
      ownerId: "owner-a",
      matterId: created.id,
      expectedVersion: created.version,
      rawInput: allRequiredElementsVerified,
    });

    await assert.rejects(() =>
      adapter.saveIntake({
        ownerId: "owner-a",
        matterId: created.id,
        expectedVersion: created.version,
        rawInput: allRequiredElementsVerified,
      }),
    );
  });
});
