import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RegistryAdapterRegistry,
  buildNameSearchPlan,
  executeSearchPlan,
  searchExecutionNoHitIsConclusive,
  type RegistryAdapter,
} from "../src/index.js";

describe("search strategy", () => {
  test("searches the exact authoritative name before broader variants", () => {
    const plan = buildNameSearchPlan({
      purpose: "registered-organization-search",
      jurisdiction: { country: "US", state: "CA" },
      capability: "name-search",
      sourceKind: "business-registry",
      seeds: [{ name: "Smith Holdings, L.L.C.", role: "authoritative" }],
      policy: {
        allowedVariantKinds: ["exact-authoritative", "normalized-legal-form", "base-name"],
        maxVariants: 10,
        requireAuthoritativeExact: true,
        requireCompleteResults: false,
      },
    });

    assert.equal(plan.steps[0]?.variantKind, "exact-authoritative");
    assert.equal(plan.steps[0]?.value, "Smith Holdings, L.L.C.");
    assert.ok(plan.steps.some((step) => step.variantKind === "base-name"));
  });

  test("safe defaults do not automatically add base-name or middle-initial variants", () => {
    const plan = buildNameSearchPlan({
      purpose: "identity-search",
      jurisdiction: { country: "US" },
      capability: "name-search",
      seeds: [{ name: "John Robert Smith", role: "authoritative" }],
    });

    assert.ok(!plan.steps.some((step) => step.variantKind === "base-name"));
    assert.ok(!plan.steps.some((step) => step.variantKind === "middle-initial"));
  });

  test("executes planned variants through registered adapters and preserves completeness", async () => {
    const source = {
      id: "business-ca",
      name: "Business CA",
      kind: "business-registry" as const,
      jurisdiction: { country: "US", state: "CA" },
      officialUrl: "https://example.gov/business",
      accessMethod: "api" as const,
      capabilities: ["name-search"] as const,
      enabled: true,
    };
    const adapter: RegistryAdapter = {
      source,
      supports: () => true,
      async search(query) {
        return {
          query,
          source,
          records: [],
          completeness: "complete",
          searchedAt: "2026-09-17T00:00:00.000Z",
          warnings: [],
        };
      },
    };
    const registry = new RegistryAdapterRegistry().register(adapter);
    const plan = buildNameSearchPlan({
      purpose: "registered-organization-search",
      jurisdiction: { country: "US", state: "CA" },
      capability: "name-search",
      sourceKind: "business-registry",
      seeds: [{ name: "Smith Holdings LLC", role: "authoritative" }],
      policy: {
        allowedVariantKinds: ["exact-authoritative"],
        maxVariants: 3,
        requireAuthoritativeExact: true,
        requireCompleteResults: true,
        requiredSourceIds: ["business-ca"],
      },
    });

    const execution = await executeSearchPlan({ plan, registry });
    assert.equal(execution.completeness, "complete");
    assert.equal(execution.attempts[0]?.status, "success");
    assert.equal(searchExecutionNoHitIsConclusive(execution), true);
  });

  test("missing required source makes a no-hit search nonconclusive", async () => {
    const registry = new RegistryAdapterRegistry();
    const plan = buildNameSearchPlan({
      purpose: "identity-search",
      jurisdiction: { country: "US", state: "CA" },
      capability: "name-search",
      seeds: [{ name: "Smith Holdings LLC", role: "authoritative" }],
      policy: {
        allowedVariantKinds: ["exact-authoritative"],
        maxVariants: 3,
        requireAuthoritativeExact: true,
        requireCompleteResults: true,
        requiredSourceIds: ["required-source"],
      },
    });

    const execution = await executeSearchPlan({ plan, registry });
    assert.notEqual(execution.completeness, "complete");
    assert.equal(searchExecutionNoHitIsConclusive(execution), false);
  });
});
