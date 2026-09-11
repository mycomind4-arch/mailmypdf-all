import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
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


test("CP504 input preserves collection response facts without manufacturing an appeal", () => {
  const input = validateCaseInput("cp504-response", {
    taxpayerName: "Jordan Smith",
    ssnOrItin: "***-**-1234",
    taxpayerAddress: "1 Main St\nAustin, TX 78701",
    taxYear: "2024",
    responseMode: "already-paid",
    userFacts: "Payment cleared before the notice date.",
    collectionConcern: "Account may not reflect the payment.",
    requestedOutcome: "Correct the account record.",
  });
  assert.equal(input.responseMode, "already-paid");
  assert.equal(input.collectionConcern, "Account may not reflect the payment.");
});

test("CP504 rejects unsupported formal-appeal shortcuts", () => {
  assert.throws(() => validateCaseInput("cp504-response", {
    taxpayerName: "Jordan Smith",
    ssnOrItin: "***-**-1234",
    taxpayerAddress: "1 Main St",
    taxYear: "2024",
    responseMode: "cdp",
  }), /incomplete or invalid/);
});


test("CP504 is routed through the executable secure notice shell", async () => {
  const route = await readFile(new URL("../src/routes/notice/$.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/lib/notice-response-workflow-client.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../src/components/workflows/irs-notice-workflow.tsx", import.meta.url), "utf8");

  assert.match(route, /slug === "cp504-response"/);
  assert.match(route, /<IrsNoticeWorkflow workflow=\{slug\}/);
  assert.match(client, /"cp504-response"/);
  assert.match(ui, /IRS CP504/);
  assert.match(ui, /already-paid/);
  assert.match(ui, /general letter as a formal collection appeal/);
});


test("CP523 input preserves installment-agreement default facts", () => {
  const input = validateCaseInput("cp523-response", {
    taxpayerName: "Jordan Smith",
    ssnOrItin: "***-**-1234",
    taxpayerAddress: "1 Main St\nAustin, TX 78701",
    taxYear: "2024",
    responseMode: "request-reinstatement",
    pastDueAmount: "$300",
    missedPaymentReason: "Bank account changed.",
    reinstatementFacts: "The missed payment has been addressed.",
    userFacts: "The taxpayer wants to discuss reinstatement.",
  });
  assert.equal(input.responseMode, "request-reinstatement");
  assert.equal(input.pastDueAmount, "$300");
});

test("CP523 rejects a generic appeal shortcut", () => {
  assert.throws(() => validateCaseInput("cp523-response", {
    taxpayerName: "Jordan Smith",
    ssnOrItin: "***-**-1234",
    taxpayerAddress: "1 Main St",
    taxYear: "2024",
    responseMode: "appeal",
  }), /incomplete or invalid/);
});

test("CP523 is routed through the executable secure notice shell", async () => {
  const route = await readFile(new URL("../src/routes/notice/$.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/lib/notice-response-workflow-client.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../src/components/workflows/irs-notice-workflow.tsx", import.meta.url), "utf8");

  assert.match(route, /slug === "cp523-response"/);
  assert.match(client, /"cp523-response"/);
  assert.match(ui, /IRS CP523/);
  assert.match(ui, /request-reinstatement/);
  assert.match(ui, /installment-agreement default notice/);
});
