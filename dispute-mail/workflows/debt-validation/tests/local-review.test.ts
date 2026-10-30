import assert from "node:assert/strict";
import test from "node:test";
import { validateDebtValidationIntake, draftDebtValidationLetter } from "../domain";
import {
  changeLocalRecipient,
  confirmLocalRecipient,
  emptyDebtValidationIntake,
  replaceLocalNotice,
  readLocalDebtValidationNoticePdf,
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

test("local debt-validation notice: PDF header is checked before local fingerprint", async () => {
  const notice = new File(["%PDF-1.7\n%%EOF"], "synthetic.pdf", { type: "application/pdf" });
  const bytes = await readLocalDebtValidationNoticePdf(notice);
  assert.equal(new TextDecoder().decode(bytes), "%PDF-1.7\n%%EOF");
});

test("local debt-validation notice: renamed text and invalid PDF versions fail closed", async () => {
  for (const [name, contents] of [
    ["renamed.pdf", "NOT-A-PDF\n%%EOF"],
    ["invalid.pdf", "%PDF-3.0\n%%EOF"],
    ["image.pdf", "\\x89PNGDATA\n%%EOF"],
  ]) {
    const file = new File([contents], name, { type: "application/pdf" });
    await assert.rejects(readLocalDebtValidationNoticePdf(file), /recognized PDF header/);
  }
});

test("local debt-validation notice: truncated PDF without EOF marker fails closed", async () => {
  await assert.rejects(readLocalDebtValidationNoticePdf(
    new File(["%PDF-1.7\\npartial-data"], "truncated.pdf", { type: "application/pdf" }),
  ), /PDF end marker/);
});

test("local debt-validation notice: empty, oversized, non-PDF and truncated reads fail closed", async () => {
  await assert.rejects(readLocalDebtValidationNoticePdf(
    new File([""], "empty.pdf", { type: "application/pdf" }),
  ), /nonempty PDF/);
  await assert.rejects(readLocalDebtValidationNoticePdf(
    new File(["%PDF-1.7"], "not-pdf.txt", { type: "text/plain" }),
  ), /nonempty PDF/);
  await assert.rejects(readLocalDebtValidationNoticePdf({
    name: "oversized.pdf", type: "application/pdf", size: 12 * 1024 * 1024 + 1,
    arrayBuffer: async () => { throw new Error("oversized file must not be read"); },
  }), /no larger than 12 MB/);
  await assert.rejects(readLocalDebtValidationNoticePdf({
    name: "truncated.pdf", type: "application/pdf", size: 100,
    arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7").buffer,
  }), /read completely/);
});
