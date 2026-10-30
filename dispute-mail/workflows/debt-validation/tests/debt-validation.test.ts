import assert from "node:assert/strict";
import test from "node:test";
import {
  debtValidationTimingNote,
  draftDebtValidationLetter,
  normalizeMailingAddress,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";

const sha = "a".repeat(64);
const replacementSha = "b".repeat(64);
function fixture(): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Sample Collections",
    collectorResponseAddress: "Sample Collections\nPO Box 456\nAustin, TX 78701",
    accountReference: "SYN-1234",
    disputeExplanation: "I do not recognize the amount claimed in the collection notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "synthetic-notice-1",
    noticeSha256: sha,
    noticeVersion: 3,
    noticeResponseAddress: "Sample Collections\nPO Box 456\nAustin, TX 78701",
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: "2026-11-12",
    recipientConfirmed: true,
    confirmedRecipientAddress: "Sample Collections\nPO Box 456\nAustin, TX 78701",
    confirmedNoticeSha256: sha,
    confirmedNoticeDocumentId: "synthetic-notice-1",
    confirmedNoticeVersion: 3,
  };
}
const codes = (input: DebtValidationIntake) => validateDebtValidationIntake(input).map((i) => i.code);

test("debt-validation: confirmed controlling notice permits a factual letter", () => {
  const input = fixture();
  assert.deepEqual(codes(input), []);
  const letter = draftDebtValidationLetter(input, "2026-10-30");
  assert.match(letter, /Sample Collections\nPO Box 456\nAustin, TX 78701/);
  assert.doesNotMatch(letter, /Sample Collections\\nSample Collections/);
  assert.match(letter, /I dispute the debt/);
  assert.match(letter, /name and mailing address of the original creditor/);
  assert.match(letter, /not an admission/);
  assert.doesNotMatch(letter, /must stop collecting|within 30 days|automatically/);
});

test("debt-validation: recipient confirmation is mandatory", () => {
  const input = { ...fixture(), recipientConfirmed: false };
  assert.ok(codes(input).includes("unconfirmed_recipient"));
  assert.throws(() => draftDebtValidationLetter(input, "2026-10-30"), /unconfirmed_recipient/);
});

test("debt-validation: changed destination after confirmation blocks", () => {
  const input = { ...fixture(), collectorResponseAddress: "Sample Collections\nPO Box 999\nAustin, TX 78701" };
  assert.ok(codes(input).includes("recipient_mismatch"));
  assert.throws(() => draftDebtValidationLetter(input, "2026-10-30"), /recipient_mismatch/);
});

test("debt-validation: notice recipient and confirmed recipient must agree", () => {
  const input = { ...fixture(), confirmedRecipientAddress: "Sample Collections\nPO Box 999\nAustin, TX 78701" };
  assert.ok(codes(input).includes("recipient_mismatch"));
});

test("debt-validation: notice replacement invalidates confirmation", () => {
  const input = { ...fixture(), noticeSha256: replacementSha };
  assert.ok(codes(input).includes("notice_changed"));
});

test("debt-validation: changed notice document id invalidates confirmation", () => {
  const input = { ...fixture(), noticeDocumentId: "synthetic-notice-2" };
  assert.ok(codes(input).includes("notice_changed"));
});

test("debt-validation: reanalysis/revision invalidates confirmation", () => {
  const input = { ...fixture(), noticeVersion: 4 };
  assert.ok(codes(input).includes("notice_changed"));
});

test("debt-validation: missing notice or unverified address blocks", () => {
  const input = { ...fixture(), noticeResponseAddress: "", noticeSha256: "not-a-digest" };
  assert.ok(codes(input).includes("missing_notice"));
});

test("debt-validation: never invent a 30-day deadline from a contact date", () => {
  const input = { ...fixture(), noticeDisputeDeadline: null };
  assert.match(debtValidationTimingNote(input), /No verified notice-specific/);
  assert.doesNotMatch(debtValidationTimingNote(input), /2026-11-09/);
  assert.match(debtValidationTimingNote(fixture()), /2026-11-12/);
  assert.ok(codes({ ...fixture(), noticeDisputeDeadline: "2026-02-30" }).includes("invalid_notice_date"));
});

test("debt-validation: refuse malformed inputs and unsafe control characters", () => {
  assert.ok(codes({ ...fixture(), consumerName: "X\nForged recipient" }).includes("missing_consumer"));
  assert.ok(codes({ ...fixture(), disputeExplanation: "Text\u0000payload" }).includes("missing_dispute"));
  assert.ok(codes({ ...fixture(), accountReference: "" }).includes("missing_account"));
  assert.throws(() => draftDebtValidationLetter(fixture(), "2026-02-30"), /real letter date/);
});

test("debt-validation: recipient normalization allows harmless case/space differences", () => {
  const input = { ...fixture(), confirmedRecipientAddress: " sample collections \n PO BOX 456 \n AUSTIN, tx 78701 " };
  assert.equal(normalizeMailingAddress(input.confirmedRecipientAddress), normalizeMailingAddress(input.noticeResponseAddress));
  assert.deepEqual(codes(input), []);
});

test("debt-validation: negative cases never reach a mocked checkout handoff", async () => {
  let checkoutCalls = 0;
  const mockedCheckout = async () => { checkoutCalls += 1; };
  const candidates = [
    { ...fixture(), recipientConfirmed: false },
    { ...fixture(), collectorResponseAddress: "Sample Collections\nPO Box 999\nAustin, TX 78701" },
    { ...fixture(), noticeSha256: replacementSha },
    { ...fixture(), noticeVersion: 4 },
  ];
  for (const input of candidates) {
    if (validateDebtValidationIntake(input).length === 0) await mockedCheckout();
  }
  assert.equal(checkoutCalls, 0);
  // Pure preflight only: this test does not exercise the production approval or checkout route.
});

test("debt-validation: malformed JSON cannot bypass validation or crash the preflight", () => {
  assert.deepEqual(validateDebtValidationIntake(null as unknown as DebtValidationIntake).map((x) => x.code), ["invalid_text"]);
  assert.deepEqual(codes({ ...fixture(), confirmedNoticeSha256: null } as unknown as DebtValidationIntake), ["invalid_text"]);
  assert.deepEqual(codes({ ...fixture(), recipientConfirmed: "yes" } as unknown as DebtValidationIntake), ["invalid_text"]);
});
