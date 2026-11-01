import assert from "node:assert/strict";
import test from "node:test";
import {
  draftDebtValidationEnvelopeAddress,
  draftDebtValidationLetter,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";
import {
  createDebtValidationApprovalBinding,
  debtValidationIntakeSha256,
} from "../server-approval-binding";

const noticeSha = "a".repeat(64);
const pdfSha = "b".repeat(64);
const manifestSha = "c".repeat(64);
const postalAddress = "Example Collections\nPO Box 456\nAustin, TX 78701";

function fixture(): DebtValidationIntake {
  return {
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example St\nEureka, CA 95501",
    collectorName: "Example Collections",
    collectorResponseAddress: postalAddress,
    accountReference: "REF-123",
    disputeExplanation: "The amount in the notice does not match my records.",
    requestOriginalCreditor: true,
    noticeDocumentId: "synthetic-notice",
    noticeSha256: noticeSha,
    noticeVersion: 1,
    noticeResponseAddress: postalAddress,
    noticeDate: "2026-10-10",
    noticeDisputeDeadline: null,
    recipientConfirmed: true,
    confirmedRecipientAddress: postalAddress,
    confirmedNoticeSha256: noticeSha,
    confirmedNoticeDocumentId: "synthetic-notice",
    confirmedNoticeVersion: 1,
  };
}

test("debt-validation: invisible format controls cannot enter reviewed envelope, letter or approval", () => {
  const valid = fixture();
  const packet = {
    ownerId: "synthetic-owner",
    matterId: "synthetic-matter",
    matterVersion: 1,
    totalCents: 1499,
    mailClass: "certified" as const,
    pdfSha256: pdfSha,
    enclosureManifestSha256: manifestSha,
    intakeSha256: debtValidationIntakeSha256(valid),
    recipientAddress: postalAddress,
    noticeDocumentId: valid.noticeDocumentId,
    noticeSha256: noticeSha,
    noticeVersion: valid.noticeVersion,
  };
  const trustedNotice = {
    ownerId: packet.ownerId,
    matterId: packet.matterId,
    documentId: valid.noticeDocumentId,
    sha256: noticeSha,
    version: valid.noticeVersion,
    responseMailingAddress: postalAddress,
    mailingAddressVerified: true,
  };
  const approval = (intake: DebtValidationIntake) => createDebtValidationApprovalBinding({
    ownerId: packet.ownerId,
    matterId: packet.matterId,
    intake,
    reviewedPdfSha256: pdfSha,
    trustedNotice,
    packet,
  });
  assert.deepEqual(validateDebtValidationIntake(valid), []);
  assert.equal(approval(valid).pdfSha256, pdfSha, "normal approved packet remains valid");

  // Invisible format characters can be swallowed by whitespace folding or
  // displayed differently from the actual postal/PDF bytes. They are not
  // supported by the canonical standard-font PDF generator.
  const invisible = ["\u200b", "\u200c", "\u200d", "\u2060", "\ufeff"];
  const fields = [
    "consumerName", "consumerMailingAddress", "collectorName",
    "collectorResponseAddress", "noticeResponseAddress",
    "confirmedRecipientAddress", "accountReference", "disputeExplanation",
  ] as const;
  let mockedProviderSubmissions = 0;
  const approveThenMockSubmit = (intake: DebtValidationIntake) => {
    approval(intake);
    mockedProviderSubmissions++;
  };
  for (const control of invisible) {
    for (const field of fields) {
      const original = valid[field];
      const candidate = { ...valid, [field]: original.slice(0, 2) + control + original.slice(2) };
      assert.notDeepEqual(validateDebtValidationIntake(candidate), [],
        field + " accepted U+" + control.codePointAt(0)!.toString(16));
      assert.throws(() => draftDebtValidationLetter(candidate, "2026-10-30"),
        /Debt validation blocked:/, field);
      assert.throws(() => draftDebtValidationEnvelopeAddress(candidate),
        /Debt validation envelope blocked:/, field);
      assert.throws(() => approveThenMockSubmit(candidate),
        /debt_validation_invalid_intake/, field);
    }
  }
  assert.equal(mockedProviderSubmissions, 0,
    "no mocked provider submission can follow rejected invisible-text approval");
});
