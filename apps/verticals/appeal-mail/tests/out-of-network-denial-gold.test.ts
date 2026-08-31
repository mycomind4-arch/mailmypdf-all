import { describe, expect, it } from "vitest";
import { OUT_OF_NETWORK_DENIAL_GOLD } from "../src/domain/out-of-network-denial-gold";

describe("Workflow #29 — Out-of-Network Denial Gold", () => {
  it("locks authority-first behavior and packet pricing", () => {
    expect(OUT_OF_NETWORK_DENIAL_GOLD.workflowId).toBe("out-of-network-denial");
    expect(OUT_OF_NETWORK_DENIAL_GOLD.authorityRules.some((rule) => rule.includes("Never invent network status"))).toBe(true);
    expect(OUT_OF_NETWORK_DENIAL_GOLD.capabilities).toContain("independent-validation");
    expect(OUT_OF_NETWORK_DENIAL_GOLD.capabilities).toContain("pricing");
    expect(OUT_OF_NETWORK_DENIAL_GOLD.capabilities).toContain("proof");
    expect(OUT_OF_NETWORK_DENIAL_GOLD.pricing.preparationFee).toBe(24.99);
    expect(OUT_OF_NETWORK_DENIAL_GOLD.pricing.includedResponsePages).toBe(3);
  });
});
