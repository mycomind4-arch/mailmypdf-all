import assert from "node:assert/strict";
import test from "node:test";
import {
  debtValidationTimingNote,
  draftDebtValidationLetter,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";

// Dates are manually transcribed from the controlling collection notice.
// A deadline before that same notice's issue date is a contradictory intake,
// not a verified legal deadline or a mail-ready dispute.
const noticeSha = "a".repeat(64);
function fixture(): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nSacramento, CA 95814",
    collectorName: "Example Collections",
    collectorResponseAddress: "Example Collections\nPO Box 456\nAustin, TX 78701",
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "I dispute the amount shown on this notice.",
    requestOriginalCreditor: true,
    noticeDocumentId: "notice-1",
    noticeSha256: noticeSha,
    noticeVersion: 1,
    noticeResponseAddress: "Example Collections\nPO Box 456\nAustin, TX 78701",
    noticeDate: "2026-11-10",
    noticeDisputeDeadline: "2026-11-09",
    recipientConfirmed: true,
    confirmedRecipientAddress: "Example Collections\nPO Box 456\nAustin, TX 78701",
    confirmedNoticeSha256: noticeSha,
    confirmedNoticeDocumentId: "notice-1",
    confirmedNoticeVersion: 1,
  };
}

test("debt validation blocks a transcribed dispute deadline before the controlling notice date", () => {
  const intake = fixture();
  const blockers = validateDebtValidationIntake(intake).map((issue) => issue.code);
  assert.ok(blockers.includes("invalid_notice_date"), "contradictory notice chronology must fail closed");
  assert.throws(
    () => draftDebtValidationLetter(intake, "2026-11-11"),
    /invalid_notice_date/,
    "an inconsistent deadline must not enter a reviewable mailing letter",
  );
  const note = debtValidationTimingNote(intake);
  assert.match(note, /earlier|predates|conflict/i);
  assert.doesNotMatch(note, /You entered 2026-11-09 as the deadline printed/i);
});

test("debt validation accepts equal/later printed deadlines without calculating legal timeliness", () => {
  for (const deadline of ["2026-11-10", "2026-11-30"]) {
    const intake = { ...fixture(), noticeDisputeDeadline: deadline };
    assert.deepEqual(validateDebtValidationIntake(intake), []);
    assert.match(draftDebtValidationLetter(intake, "2026-11-11"), /I dispute the debt/);
    assert.match(debtValidationTimingNote(intake), /not independently verified/i);
  }
  // A missing printed notice date is not permission to invent one.
  const noNoticeDate = { ...fixture(), noticeDate: null };
  assert.deepEqual(validateDebtValidationIntake(noNoticeDate), []);
});

test("debt validation refuses a letter dated before its controlling notice", () => {
  const intake = { ...fixture(), noticeDisputeDeadline: "2026-11-30" };
  assert.deepEqual(validateDebtValidationIntake(intake), []);
  assert.throws(
    () => draftDebtValidationLetter(intake, "2026-11-09"),
    /letter date.*before.*notice date/i,
    "a response letter cannot predate the collection notice it disputes",
  );
  // Same-day or later letters remain possible; no statutory deadline is inferred.
  assert.match(draftDebtValidationLetter(intake, "2026-11-10"), /I dispute the debt/);
  assert.match(draftDebtValidationLetter(intake, "2026-11-11"), /I dispute the debt/);
});
