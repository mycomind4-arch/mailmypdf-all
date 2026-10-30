import assert from "node:assert/strict";
import test from "node:test";
import { validateDebtValidationIntake, draftDebtValidationLetter } from "../domain";
import {
  changeLocalRecipient,
  confirmLocalRecipient,
  emptyDebtValidationIntake,
  replaceLocalNotice,
} from "../local-review";

const source = { documentId: "local:synthetic-notice", sha256: "a".repeat(64) };
const address = "Example Collections\nPO Box 123\nAustin, TX 78701";

function completeIntake() {
  const initial = replaceLocalNotice(emptyDebtValidationIntake(), source);
  return {
    ...initial,
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "Synthetic Consumer\n12 Example Road\nEureka, CA 95501",
    collectorName: "Example Collections",
    noticeResponseAddress: address,
    collectorResponseAddress: address,
    accountReference: "SYNTHETIC-123",
    disputeExplanation: "The stated balance does not match my records.",
  };
}

test("local debt-validation review: exact notice and address can be confirmed and drafted", () => {
  const confirmed = confirmLocalRecipient(completeIntake());
  assert.equal(confirmed.recipientConfirmed, true);
  assert.deepEqual(validateDebtValidationIntake(confirmed), []);
  assert.match(draftDebtValidationLetter(confirmed, "2026-10-30"), /SYNTHETIC-123/);
});

test("local debt-validation review: no confirmation prevents letter generation", () => {
  const intake = completeIntake();
  assert.ok(validateDebtValidationIntake(intake).some((issue) => issue.code === "unconfirmed_recipient"));
  assert.throws(() => draftDebtValidationLetter(intake, "2026-10-30"), /unconfirmed_recipient/);
});

test("local debt-validation review: changed recipient revokes confirmation", () => {
  const confirmed = confirmLocalRecipient(completeIntake());
  const changed = changeLocalRecipient(confirmed, {
    collectorResponseAddress: "Example Collections\nPO Box 999\nAustin, TX 78701",
  });
  assert.equal(changed.recipientConfirmed, false);
  assert.equal(changed.confirmedNoticeSha256, "");
  assert.throws(() => draftDebtValidationLetter(changed, "2026-10-30"));
});

test("local debt-validation review: replacing notice revokes confirmation and clears stale destination", () => {
  const confirmed = confirmLocalRecipient(completeIntake());
  const replaced = replaceLocalNotice(confirmed, { documentId: "local:replacement", sha256: "b".repeat(64) });
  assert.equal(replaced.noticeVersion, confirmed.noticeVersion + 1);
  assert.equal(replaced.recipientConfirmed, false);
  assert.equal(replaced.noticeResponseAddress, "");
  assert.equal(replaced.collectorResponseAddress, "");
  assert.throws(() => draftDebtValidationLetter(replaced, "2026-10-30"));
});

test("local debt-validation review: a forged destination cannot be confirmed", () => {
  const intake = completeIntake();
  assert.throws(() => confirmLocalRecipient({
    ...intake, collectorResponseAddress: "Example Collections\nPO Box 999\nAustin, TX 78701",
  }), /Review the complete notice/);
});
