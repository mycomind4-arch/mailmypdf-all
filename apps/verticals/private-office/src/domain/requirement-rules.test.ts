import { describe, expect, it } from "vitest";
import { evaluateRequirement, allOf, anyOf } from "./requirement-rules";

describe("requirement rules", () => {
  const context = {
    completed: new Set(["llc", "ein"]),
    facts: { entity: { type: "llc", active: true }, hasEmployees: false },
  };

  it("evaluates ALL", () => {
    expect(evaluateRequirement(allOf("llc", "ein"), context).satisfied).toBe(true);
    expect(evaluateRequirement(allOf("llc", "bank"), context)).toEqual({
      satisfied: false,
      missing: ["bank"],
    });
  });

  it("evaluates ANY", () => {
    expect(evaluateRequirement(anyOf("bank", "llc"), context).satisfied).toBe(true);
    expect(evaluateRequirement(anyOf("bank", "accounting"), context).satisfied).toBe(false);
  });

  it("evaluates thresholds", () => {
    const rule = {
      type: "threshold" as const,
      minimum: 2,
      rules: [
        { type: "capability" as const, capabilityId: "llc" },
        { type: "capability" as const, capabilityId: "ein" },
        { type: "capability" as const, capabilityId: "bank" },
      ],
    };
    expect(evaluateRequirement(rule, context).satisfied).toBe(true);
  });

  it("evaluates fact paths", () => {
    expect(evaluateRequirement({ type: "fact", path: "entity.type", equals: "llc" }, context).satisfied).toBe(true);
    expect(evaluateRequirement({ type: "fact", path: "entity.active", equals: false }, context).satisfied).toBe(false);
    expect(evaluateRequirement({ type: "fact", path: "missing.value" }, context).satisfied).toBe(false);
  });
});
