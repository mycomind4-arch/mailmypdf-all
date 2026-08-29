import { describe, expect, it } from "vitest";
import { LIFE_INSURANCE_DENIAL_GOLD } from "../../src/domain/life-insurance-denial-gold";

describe("Workflow #31 — Life Insurance Denial Gold contract", () => {
  it("has the required authority, pipeline, and pricing capabilities", () => {
    expect(LIFE_INSURANCE_DENIAL_GOLD.workflowId).toBe("life-insurance-denial");
    expect(LIFE_INSURANCE_DENIAL_GOLD.capabilities).toEqual(expect.arrayContaining([
      "authority-resolution",
      "deadline-verification",
      "independent-validation",
      "human-approval",
      "pricing",
      "deterministic-pdf",
      "mailing",
      "proof",
    ]));
    expect(LIFE_INSURANCE_DENIAL_GOLD.pricing.preparationFee).toBe(24.99);
    expect(LIFE_INSURANCE_DENIAL_GOLD.pricing.includedResponsePages).toBe(3);
    expect(LIFE_INSURANCE_DENIAL_GOLD.pricing.responsePagePrice).toBe(0.45);
    expect(LIFE_INSURANCE_DENIAL_GOLD.pricing.supportingPagePrice).toBe(0.25);
  });

  it("refuses unsupported policy and procedural conclusions", () => {
    expect(LIFE_INSURANCE_DENIAL_GOLD.authorityRules.join(" ")).toMatch(/Never invent policy provisions/i);
    expect(LIFE_INSURANCE_DENIAL_GOLD.authorityRules.join(" ")).toMatch(/Unsupported policy.*procedural conclusions remain unresolved/i);
  });
});
