import { describe, expect, it } from "vitest";
import { DENTAL_INSURANCE_APPEAL_GOLD } from "../../src/domain/dental-insurance-appeal-gold";

describe("Workflow #30 Dental Insurance Appeal Gold contract", () => {
  it("declares the full authority and fulfillment lifecycle", () => {
    expect(DENTAL_INSURANCE_APPEAL_GOLD.workflowId).toBe("dental-insurance-appeal");
    expect(DENTAL_INSURANCE_APPEAL_GOLD.capabilities).toContain("independent-validation");
    expect(DENTAL_INSURANCE_APPEAL_GOLD.capabilities).toContain("deterministic-pdf");
    expect(DENTAL_INSURANCE_APPEAL_GOLD.capabilities).toContain("proof");
  });

  it("locks transparent workflow-specific packet pricing", () => {
    expect(DENTAL_INSURANCE_APPEAL_GOLD.pricing.preparationFee).toBe(24.99);
    expect(DENTAL_INSURANCE_APPEAL_GOLD.pricing.includedResponsePages).toBe(3);
    expect(DENTAL_INSURANCE_APPEAL_GOLD.pricing.supportingPagePrice).toBe(0.25);
    expect(DENTAL_INSURANCE_APPEAL_GOLD.pricing.certifiedMail).toBe(12.49);
  });
});
