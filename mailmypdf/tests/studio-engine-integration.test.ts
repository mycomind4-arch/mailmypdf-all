import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRegistry } from "@mailmypdf/workflows/capability-registry";
import {
  studioCapabilityCatalog,
  studioRunnableEngines,
  findStudioCapability,
} from "../src/studio/domain/studio-capability-catalog";
import {
  executeStudioEngine,
  StudioEngineInputError,
} from "../src/studio/platform/studio-engine-executor";

test("Studio catalog reflects every canonical registry capability without conflating maturity with live bindings", () => {
  for (const id of capabilityRegistry.ids()) {
    const item = findStudioCapability(id);
    assert.ok(item, "Missing canonical capability " + id);
    assert.equal(item.status, capabilityRegistry.getOrThrow(id).status);
    assert.equal(item.packageName, capabilityRegistry.getOrThrow(id).implementation);
    assert.equal(item.runnable, false, "Package implementation is not a Studio runtime binding: " + id);
  }
  assert.ok(studioCapabilityCatalog.length >= capabilityRegistry.ids().length + studioRunnableEngines.length);
  assert.equal(findStudioCapability("payment")?.requiresApproval, true);
});

test("Every advertised live Studio engine runs its actual package export using its example input", () => {
  for (const engine of studioRunnableEngines) {
    const result = executeStudioEngine(engine.id, engine.exampleInput);
    assert.equal(result.executed, true);
    assert.equal(result.sideEffects, "none");
    assert.equal(result.packageName, engine.packageName);
    assert.ok(result.output !== undefined);
  }
});

test("Name comparison returns package-generated normalized forms", () => {
  const result = executeStudioEngine("studio.name-normalization", { name: "Acme LLC", compareTo: "ACME Limited Liability Company" });
  const output = result.output as { comparison: { disposition: string } };
  assert.equal(output.comparison.disposition, "same-normalized-form");
});

test("Source authority and entity resolution only provide advisory evidence results", () => {
  const source = { id: "official-1", sourceType: "official-registry-record", provenanceLevel: "external_source" };
  const rated = executeStudioEngine("studio.source-authority", { source, context: { purpose: "registered-organization-name" } });
  assert.ok((rated.output as { score: number }).score > 0);
  const entity = executeStudioEngine("studio.entity-classification", { signals: [{ id: "s1", proposedType: "registered-organization", source }] });
  assert.ok((entity.output as { disposition: string }).disposition);
});

test("Secured eligibility screen cannot authorize a consequential action", () => {
  const result = executeStudioEngine("studio.secured-eligibility", { evidence: {} });
  const output = result.output as { canProceedToConsequentialAction: boolean; status: string };
  assert.equal(output.canProceedToConsequentialAction, false);
  assert.equal(output.status, "blocked");
});

test("Exhibit index is produced by the shared packet-builder engine", () => {
  const output = executeStudioEngine("studio.exhibit-index", { items: [{ evidenceId: "d1", label: "Agreement" }] }).output as { text: string };
  assert.match(output.text, /Exhibit A/);
});

test("Registry dependency engine resolves dependencies without executing them", () => {
  const output = executeStudioEngine("studio.capability-dependencies", { capabilityIds: ["evidence"] }).output as { ordered: string[]; errors: string[] };
  assert.equal(output.errors.length, 0);
  assert.ok(output.ordered.includes("evidence"));
});

test("Unlisted engines and invalid or unsafe submissions fail closed", () => {
  assert.throws(() => executeStudioEngine("studio.payment", {}), StudioEngineInputError);
  assert.throws(() => executeStudioEngine("studio.name-normalization", { name: "" }), StudioEngineInputError);
  assert.throws(() => executeStudioEngine("studio.secured-eligibility", { evidence: { "invented-gate": { status: "verified", sourceRefs: [] } } }), StudioEngineInputError);
  assert.throws(() => executeStudioEngine("studio.recovery-scan", { transactions: [] }), StudioEngineInputError);
});
