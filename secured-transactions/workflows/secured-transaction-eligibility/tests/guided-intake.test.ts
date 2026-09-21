import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEligibilityDraft,
  parseEligibilityDraft,
  assessEligibilityDraft,
  eligibilitySummaryText,
  ELIGIBILITY_STEPS,
  ELIGIBILITY_FIELDS,
  type EligibilityAnswerId,
  type IntakeField,
} from "../rules/guided-intake";

test("a blank draft produces a useful gather-information plan without a legal conclusion", () => {
  const result = assessEligibilityDraft(createEligibilityDraft());
  assert.equal(result.items.length, 9);
  assert.equal(result.items.every((item) => item.status === "missing"), true);
  assert.equal(result.engine.canProceedToAnalysis, false);
  assert.equal(result.engine.canProceedToConsequentialAction, false);
  assert.equal(result.engine.verified.length, 0);
});

test("No, not yet and I don't know remain distinct answers across a draft round trip", () => {
  const draft = createEligibilityDraft();
  draft.answers.obligationStatus = "none";
  draft.answers.valueStatus = "planned";
  draft.answers.agreementStatus = "unknown";
  const restored = parseEligibilityDraft(JSON.stringify(draft));
  assert.deepEqual(restored, draft);
});

test("typing names and source labels cannot verify a legal element", () => {
  const draft = createEligibilityDraft();
  draft.answers.debtorName = "Example Equipment LLC";
  draft.answers.securedPartyName = "Example Lender";
  draft.sources["identifiable-debtor"] = "Signed agreement, page 1";
  const result = assessEligibilityDraft(draft);
  assert.equal(result.items.find((item) => item.id === "identifiable-debtor")?.status, "reported");
  assert.equal(result.engine.verified.length, 0);
  assert.equal(result.engine.gates[0]?.status, "unverified");
  assert.equal(result.engine.canProceedToAnalysis, false);
});

test("a dispute is retained even when a supporting record is named", () => {
  const draft = createEligibilityDraft();
  draft.answers.rightsStatus = "disputed";
  draft.sources["debtor-rights-in-collateral"] = "Conflicting invoices";
  const result = assessEligibilityDraft(draft);
  assert.equal(result.items.find((item) => item.id === "debtor-rights-in-collateral")?.status, "disputed");
  assert.equal(result.engine.status, "human-review-required");
  assert.equal(result.engine.canProceedToConsequentialAction, false);
});

test("a location is a fact to review, not a governing-jurisdiction determination", () => {
  const draft = createEligibilityDraft();
  draft.answers.debtorLocation = "Oregon, United States";
  draft.answers.propertyLocation = "Washington, United States";
  const result = assessEligibilityDraft(draft);
  assert.equal(result.items.find((item) => item.id === "correct-jurisdiction")?.status, "reported");
  assert.equal(result.engine.gates.find((gate) => gate.id === "correct-jurisdiction")?.status, "unverified");
});

test("imports reject tampered verdicts, unknown fields, wrong workflows and oversized text", () => {
  const draft = createEligibilityDraft();
  for (const bad of [
    { ...draft, workflowId: "ucc1-preparation-authorization" },
    { ...draft, schemaVersion: 2 },
    { ...draft, engine: { verified: ["authorization"] } },
    { ...draft, answers: { authorizationStatus: "verified" } },
    { ...draft, answers: { __unexpected: "x" } },
    { ...draft, answers: { debtorName: "x".repeat(2501) } },
    { ...draft, sources: { unexpected: "reference" } },
    { ...draft, answers: [] },
  ]) assert.throws(() => parseEligibilityDraft(JSON.stringify(bad)));
  assert.throws(() => parseEligibilityDraft("not JSON"));
  assert.throws(() => parseEligibilityDraft(" ".repeat(128001)));
});

test("every answer is preserved in the readable summary, with limitations", () => {
  const draft = createEligibilityDraft();
  draft.answers.transactionStory = "A proposed equipment loan, not yet signed.";
  draft.answers.obligationStatus = "proposed";
  draft.sources["actual-obligation"] = "Draft loan agreement";
  const text = eligibilitySummaryText(draft);
  assert.match(text, /proposed equipment loan/);
  assert.match(text, /Draft loan agreement/);
  assert.match(text, /not.*verified/i);
  assert.match(text, /not.*saved.*account/i);
  assert.equal(ELIGIBILITY_STEPS.length, 6);
});

test("a fully affirmative intake still cannot approve analysis or a consequential action", () => {
  const draft = createEligibilityDraft();
  draft.answers = {
    debtorName: "Example Provider", securedPartyName: "Example Lender",
    obligationStatus: "existing", obligationDetails: "Loan repayment",
    valueStatus: "provided", valueDetails: "Money transferred",
    rightsStatus: "owns", rightsDetails: "Reported purchase",
    agreementStatus: "signed", agreementDetails: "Reported signed agreement",
    authorizationStatus: "yes", authorizationDetails: "Reported permission",
    collateralDetails: "Printing machine", debtorLocation: "Oregon", propertyLocation: "Oregon",
  };
  const result = assessEligibilityDraft(draft);
  assert.equal(result.items.every((item) => item.status === "reported"), true);
  assert.equal(result.engine.verified.length, 0);
  assert.equal(result.engine.canProceedToAnalysis, false);
  assert.equal(result.engine.canProceedToConsequentialAction, false);
});

test("maximum-length multibyte answers round-trip within the shared file limit", () => {
  const draft = createEligibilityDraft();
  for (const [key, definition] of Object.entries(ELIGIBILITY_FIELDS)) {
    const field: IntakeField = definition;
    draft.answers[key as EligibilityAnswerId] = field.options?.[0]?.value ?? "界".repeat(2500);
  }
  for (const item of assessEligibilityDraft(draft).items) draft.sources[item.id] = "界".repeat(2500);
  const json = JSON.stringify(draft, null, 2);
  assert.ok(Buffer.byteLength(json, "utf8") < 512000);
  assert.deepEqual(parseEligibilityDraft(json), draft);
});
