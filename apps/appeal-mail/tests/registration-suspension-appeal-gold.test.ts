import { describe, expect, it } from "vitest";
import { REGISTRATION_SUSPENSION_APPEAL_GOLD } from "../src/domain/registration-suspension-appeal-gold";

describe("Registration Suspension Appeal — Gold", () => {
  it("enforces authority-first scope and transparent pricing", () => {
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.workflowId).toBe("registration-suspension-appeal");
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.capabilities).toContain("independent-validation");
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.capabilities).toContain("human-approval");
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.capabilities).toContain("pricing");
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.capabilities).toContain("proof");
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.authorityRules.some((rule) => rule.includes("Never invent"))).toBe(true);
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.pricing.preparationFee).toBe(24.99);
    expect(REGISTRATION_SUSPENSION_APPEAL_GOLD.pricing.certifiedMail).toBe(12.49);
  });
});
