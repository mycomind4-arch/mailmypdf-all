import assert from "node:assert/strict";
import test from "node:test";

import {
  BUREAU_CONFIGS,
  generateCreditDisputeDraft,
  buildCreditDisputeDraftParams,
  getCreditDisputeReadiness,
  analyzeDisputedItems,
} from "../credit-dispute";

/**
 * Ported from apps/verticals/notice-respond/tests/{equifax,experian,transunion}-dispute.test.mjs.
 * The extraction-pattern assertions from those files do not apply here (this
 * port's shared module keeps only the draft-generation and bureau-config
 * logic actually used by the new step-workflow UI — see
 * dispute-mail/shared/credit-dispute.ts's file header). The verified
 * bureau facts (mailing addresses, phone numbers) are asserted exactly as
 * the legacy tests asserted them.
 */

test("Equifax: bureau config has correct verified address", () => {
  const cfg = BUREAU_CONFIGS.equifax;
  assert.equal(cfg.name, "Equifax");
  assert.equal(cfg.mailingAddress.org, "Equifax Information Services LLC");
  assert.equal(cfg.mailingAddress.city, "Atlanta");
  assert.equal(cfg.mailingAddress.state, "GA");
  assert.equal(cfg.mailingAddress.zip, "30374-0256");
  assert.ok(cfg.mailingAddress.line1.includes("P.O. Box 740256"));
  assert.equal(cfg.phone, "866-349-5191");
});

test("Experian: bureau config has correct verified address", () => {
  const cfg = BUREAU_CONFIGS.experian;
  assert.equal(cfg.name, "Experian");
  assert.equal(cfg.mailingAddress.city, "Allen");
  assert.equal(cfg.mailingAddress.state, "TX");
  assert.equal(cfg.mailingAddress.zip, "75013");
  assert.ok(cfg.mailingAddress.line1.includes("P.O. Box 4500"));
  assert.equal(cfg.phone, "888-397-3742");
});

test("TransUnion: bureau config has correct verified address", () => {
  const cfg = BUREAU_CONFIGS.transunion;
  assert.equal(cfg.name, "TransUnion");
  assert.equal(cfg.mailingAddress.org, "TransUnion LLC");
  assert.equal(cfg.mailingAddress.city, "Chester");
  assert.equal(cfg.mailingAddress.state, "PA");
  assert.equal(cfg.mailingAddress.zip, "19016");
  assert.ok(cfg.mailingAddress.line2.includes("P.O. Box 2000"));
  assert.equal(cfg.phone, "800-916-8800");
});

test("Equifax: draft addresses Equifax with verified mailing address", () => {
  const draft = generateCreditDisputeDraft({
    bureauId: "equifax",
    consumerName: "Michael Brown",
    consumerAddress: "789 Pine St, Dallas, TX 75201",
    reportDate: "08/15/2026",
    reportNumber: "EQ555123456",
    disputedItems: [
      { accountName: "Wells Fargo", accountNumber: "********8821", errorType: "incorrect_amount", errorDescription: "Balance is incorrect", correctInformation: "Balance should be $0" },
    ],
    userFacts: "Wells Fargo was paid off.",
    userObjective: "Remove the incorrect balance.",
  });
  assert.ok(draft.includes("Equifax"));
  assert.ok(draft.includes("FCRA"));
  assert.ok(draft.includes("1681i"));
  assert.ok(draft.includes("Wells Fargo"));
  assert.ok(draft.includes("Atlanta, GA"));
  assert.ok(draft.includes("P.O. Box 740256"));
});

test("Experian: draft addresses Experian with verified mailing address", () => {
  const draft = generateCreditDisputeDraft({
    bureauId: "experian",
    consumerName: "Test Consumer",
    consumerAddress: null,
    reportDate: null,
    reportNumber: null,
    disputedItems: [],
    userFacts: "",
    userObjective: "",
  });
  assert.ok(draft.includes("Experian"));
  assert.ok(draft.includes("To Whom It May Concern"));
  assert.ok(draft.includes("Allen, TX"));
  assert.ok(draft.includes("P.O. Box 4500"));
});

test("TransUnion: draft addresses TransUnion with verified mailing address", () => {
  const draft = generateCreditDisputeDraft({
    bureauId: "transunion",
    consumerName: "Test Consumer",
    consumerAddress: null,
    reportDate: null,
    reportNumber: null,
    disputedItems: [],
    userFacts: "",
    userObjective: "",
  });
  assert.ok(draft.includes("TransUnion"));
  assert.ok(draft.includes("Chester, PA"));
  assert.ok(draft.includes("P.O. Box 2000"));
  assert.ok(draft.includes("Sincerely"));
});

test("draft includes FCRA 30-day reinvestigation language for all three bureaus", () => {
  for (const bureauId of ["equifax", "experian", "transunion"] as const) {
    const draft = generateCreditDisputeDraft({
      bureauId,
      consumerName: "Test",
      consumerAddress: null,
      reportDate: null,
      reportNumber: null,
      disputedItems: [],
      userFacts: "",
      userObjective: "",
    });
    assert.ok(draft.includes("30 days"), `${bureauId} draft should mention 30 days`);
    assert.ok(draft.includes("Section 611"), `${bureauId} draft should cite FCRA Section 611`);
  }
});

test("buildCreditDisputeDraftParams synthesizes facts from disputed items", () => {
  const params = buildCreditDisputeDraftParams("equifax", {
    consumerName: "Jane Doe",
    consumerAddress: "1 Main St",
    disputedItems: [
      { id: "1", creditorName: "Bank A", accountNumber: "1234", category: "not_mine", description: "Not my account", correctInformation: "" },
    ],
  });
  assert.equal(params.bureauId, "equifax");
  assert.ok(params.userFacts.includes("Bank A"));
  assert.ok(params.userObjective.includes("Equifax"));
});

test("getCreditDisputeReadiness reflects intake completeness", () => {
  const empty = getCreditDisputeReadiness({});
  assert.ok(empty.every((item) => !item.done));

  const complete = getCreditDisputeReadiness({
    consumerName: "Jane Doe",
    consumerAddress: "1 Main St",
    disputedItems: [
      { id: "1", creditorName: "Bank A", accountNumber: "1234", category: "not_mine", description: "Not my account", correctInformation: "" },
    ],
    documentCategories: ["Credit report", "Proof of identity"],
  });
  assert.ok(complete.find((i) => i.id === "consumer")?.done);
  assert.ok(complete.find((i) => i.id === "items")?.done);
  assert.ok(complete.find((i) => i.id === "creditReport")?.done);
  assert.ok(complete.find((i) => i.id === "identityProof")?.done);
});

test("analyzeDisputedItems flags identity-theft claims without supporting document", () => {
  const analysis = analyzeDisputedItems(
    [{ id: "1", creditorName: "Bank A", accountNumber: "1234", category: "not_mine", description: "Not my account", correctInformation: "" }],
    [],
  );
  assert.equal(analysis[0].strength, "needs_more");
  assert.ok(analysis[0].gap?.includes("police report"));
});

test("analyzeDisputedItems marks item strong once category, description, and evidence align", () => {
  const analysis = analyzeDisputedItems(
    [{ id: "1", creditorName: "Bank A", accountNumber: "1234", category: "not_mine", description: "Not my account", correctInformation: "" }],
    ["Identity theft report"],
  );
  assert.equal(analysis[0].strength, "strong");
});
