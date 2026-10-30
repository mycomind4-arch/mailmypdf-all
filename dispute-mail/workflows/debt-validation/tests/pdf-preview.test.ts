import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createLocalDebtValidationPdfPreview } from "../pdf-preview";
import {
  confirmLocalRecipient,
  emptyDebtValidationIntake,
  replaceLocalNotice,
  changeLocalRecipient,
} from "../local-review";

const recipient = "Example Collections\nPO Box 456\nAustin, TX 78701";
function confirmedIntake() {
  const source = replaceLocalNotice(emptyDebtValidationIntake(), {
    documentId: "local:synthetic-notice", sha256: "a".repeat(64),
  });
  return confirmLocalRecipient({
    ...source,
    consumerName: "Synthetic Consumer",
    consumerMailingAddress: "123 Example Street\nEureka, CA 95501",
    collectorName: "Example Collections",
    collectorResponseAddress: recipient,
    noticeResponseAddress: recipient,
    accountReference: "SYNTHETIC-456",
    disputeExplanation: "The claimed balance does not match my records.",
  });
}

test("debt-validation: canonical PDF preview is a letter-only packet with verified SHA-256", async () => {
  const result = await createLocalDebtValidationPdfPreview(confirmedIntake(), "2026-10-30");
  assert.equal(new TextDecoder().decode(result.bytes.slice(0, 5)), "%PDF-");
  assert.equal(result.sha256, createHash("sha256").update(result.bytes).digest("hex"));
  assert.ok(result.responsePages >= 1);
  assert.equal(result.supportingPages, 0);
  assert.deepEqual(result.manifest, []);
});

test("debt-validation: long factual disputes produce paginated PDF", async () => {
  const intake = { ...confirmedIntake(), disputeExplanation: "The amount is incorrect. ".repeat(105) };
  const result = await createLocalDebtValidationPdfPreview(intake, "2026-10-30");
  assert.ok(result.responsePages >= 2);
  assert.equal(result.supportingPages, 0);
});

test("debt-validation: absent confirmation, changed recipient and replaced notice block PDF", async () => {
  const confirmed = confirmedIntake();
  const cases = [
    { ...confirmed, recipientConfirmed: false },
    changeLocalRecipient(confirmed, { collectorResponseAddress: "Example Collections\nPO Box 999\nAustin, TX 78701" }),
    replaceLocalNotice(confirmed, { documentId: "local:replacement", sha256: "b".repeat(64) }),
  ];
  let mockedProviderCalls = 0;
  for (const intake of cases) {
    await assert.rejects(async () => {
      await createLocalDebtValidationPdfPreview(intake, "2026-10-30");
      mockedProviderCalls++;
    }, /Debt validation blocked/);
  }
  assert.equal(mockedProviderCalls, 0);
});

test("debt-validation: invalid date and unsupported glyphs fail closed", async () => {
  await assert.rejects(
    createLocalDebtValidationPdfPreview(confirmedIntake(), "2026-02-30"), /real letter date/,
  );
  await assert.rejects(
    createLocalDebtValidationPdfPreview({
      ...confirmedIntake(), disputeExplanation: "I dispute the balance: 债务.",
    }, "2026-10-30"), /cannot represent all letter characters/,
  );
});
