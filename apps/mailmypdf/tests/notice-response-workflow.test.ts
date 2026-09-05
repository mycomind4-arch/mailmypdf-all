import assert from "node:assert/strict";
import test from "node:test";
import { validateCaseInput } from "../src/lib/secure-core/case-inputs.server";

test("CP14 input preserves a concrete response path and bounded taxpayer facts", () => {
  const input = validateCaseInput("cp14-response", {
    taxpayerName: "Jordan Smith", ssnOrItin: "***-**-1234", taxpayerAddress: "1 Main St\nAustin, TX 78701",
    taxYear: "2024", responseMode: "request-arrangement", monthlyPayment: "$200", paymentStartDate: "2026-10-15",
    firstTimeAbateConfirmed: true, penaltyReliefBasis: "Three prior years were filed and paid on time.", userFacts: "The balance is not disputed.",
  });
  assert.equal(input.responseMode, "request-arrangement");
  assert.equal(input.firstTimeAbateConfirmed, true);
});

test("CP2000 input keeps item level disagreement separate from model analysis", () => {
  const input = validateCaseInput("cp2000-response", {
    taxpayerName: "Jordan Smith", ssnOrItin: "***-**-1234", taxpayerAddress: "1 Main St",
    taxYear: "2023", responseMode: "partial-agreement", disputedItems: "Line 1 wages", correctedAmounts: "$75,000", evidenceByItem: "W-2 attached", userFacts: "Bonus was paid next year.",
  });
  assert.equal(input.responseMode, "partial-agreement");
  assert.equal(input.disputedItems, "Line 1 wages");
});

test("notice input rejects missing identity and unsupported response paths", () => {
  assert.throws(() => validateCaseInput("cp14-response", { responseMode: "pay" }), /incomplete or invalid/);
  assert.throws(() => validateCaseInput("cp2000-response", {
    taxpayerName: "A", ssnOrItin: "1", taxpayerAddress: "x", taxYear: "2024", responseMode: "request-arrangement",
  }), /incomplete or invalid/);
});
