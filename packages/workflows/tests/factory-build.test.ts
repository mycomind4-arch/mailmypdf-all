import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewedFactoryTemplatePlan,
} from "../src/factory-build.js";

const REVIEWED_NOTICE_PROFILE = {
  domain: "tax",
  noticeLabel: "State tax balance notice",
  primaryDocumentId: "state-tax-balance-notice",
  primaryDocumentLabel: "State tax balance notice",
  extractionSchema: "state.tax.balance.v1",
  sourcePurpose: "state_tax_balance_notice",
  responseModeLabel: "How do you want to respond?",
  responseModes: [
    { value: "agree", label: "Agree with the notice" },
    { value: "disagree", label: "Disagree with the notice" },
  ],
  evidenceKinds: [
    { value: "payment-record", label: "Payment record" },
    { value: "other", label: "Other supporting record" },
  ],
  explanationRequiredModes: ["disagree"],
  explanationLabel: "Explain your response",
  explanationHint: "State only verified facts supported by the notice or records.",
  requestedActionDefault: "Please review my response and supporting records.",
  analysisInstructions:
    "Identify the controlling notice and extract only notice-supported facts. Do not calculate deadlines or invent addresses, legal rights, or outcomes.",
  draftInstructions:
    "Prepare factual correspondence using only verified notice facts, user-confirmed facts, the selected response mode, and included records. Do not invent authorities, deadlines, addresses, or outcomes.",
} as const;

test("reviewed notice-response template preserves its authority-sensitive family profile", () => {
  const plan = buildReviewedFactoryTemplatePlan({
    id: "notice-respond/state-tax-balance-response",
    label: "State Tax Balance Notice Response",
    startTemplate: "notice-response",
    noticeProfile: REVIEWED_NOTICE_PROFILE,
  });

  assert.equal(plan.canonicalId, "notice-respond/state-tax-balance-response");
  assert.equal(plan.sectionId, "notice-respond");
  assert.equal(plan.slug, "state-tax-balance-response");
  assert.equal(plan.spec.execution?.kind, "platform");
  assert.equal(plan.spec.execution?.policyFamily, "notice-response");
  assert.deepEqual(plan.request.noticeProfile, REVIEWED_NOTICE_PROFILE);
  assert.deepEqual(plan.filePaths, [
    "notice-respond/workflows/state-tax-balance-response/index.tsx",
    "notice-respond/workflows/state-tax-balance-response/seo.ts",
    "notice-respond/workflows/state-tax-balance-response/schema.ts",
    "mailmypdf/src/routes/notice-respond/workflows/state-tax-balance-response/index.tsx",
    "notice-respond/workflows/state-tax-balance-response/start/index.tsx",
    "mailmypdf/src/routes/notice-respond/workflows/state-tax-balance-response/start/index.tsx",
  ]);
});

test("reviewed build plan rejects section and family drift", () => {
  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "notice-respond/public-records-request",
        label: "Public Records Request",
        startTemplate: "records-request",
      }),
    /requires records-request/,
  );
});


test("reviewed Notice Respond profiles fail closed on malformed response rules", () => {
  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "notice-respond/state-tax-balance-response",
        label: "State Tax Balance Notice Response",
        startTemplate: "notice-response",
        noticeProfile: {
          ...REVIEWED_NOTICE_PROFILE,
          explanationRequiredModes: ["not-a-response-mode"],
        },
      }),
    /not a reviewed response mode/,
  );
});


test("reviewed Notice Respond profiles reject unsupported non-tax domains", () => {
  assert.throws(
    () =>
      buildReviewedFactoryTemplatePlan({
        id: "notice-respond/benefits-notice-response",
        label: "Benefits Notice Response",
        startTemplate: "notice-response",
        noticeProfile: {
          ...REVIEWED_NOTICE_PROFILE,
          domain: "benefits" as never,
        },
      }),
    /support tax notices only/,
  );
});
