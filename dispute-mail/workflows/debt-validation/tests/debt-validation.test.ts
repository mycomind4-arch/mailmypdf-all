import assert from "node:assert/strict";
import test from "node:test";
import {
  debtValidationTimingNote,
  draftDebtValidationEnvelopeAddress,
  draftDebtValidationLetter,
  normalizeMailingAddress,
  validateDebtValidationIntake,
  type DebtValidationIntake,
} from "../domain";


test("debt-validation envelope address preview matches the confirmed notice and return address", () => {
  const exact = draftDebtValidationEnvelopeAddress(fixture());
  assert.equal(exact.recipientAddress, "Sample Collections\nPO Box 456\nAustin, TX 78701");
  assert.equal(exact.returnAddress, "Synthetic Consumer\n123 Example St\nSacramento, CA 95814");
  const unnamed = fixture();
  unnamed.collectorResponseAddress = "PO Box 456\nAustin, TX 78701";
  unnamed.noticeResponseAddress = unnamed.collectorResponseAddress;
  unnamed.confirmedRecipientAddress = unnamed.collectorResponseAddress;
  assert.equal(draftDebtValidationEnvelopeAddress(unnamed).recipientAddress,
    "Sample Collections\nPO Box 456\nAustin, TX 78701");
});

test("debt-validation envelope address preview fails closed for unconfirmed or replaced notice", () => {
  const cases = [
    { ...fixture(), recipientConfirmed: false },
    { ...fixture(), collectorResponseAddress: "Sample Collections\nPO Box 999\nAustin, TX 78701" },
    { ...fixture(), noticeSha256: replacementSha },
    { ...fixture(), noticeDocumentId: "replacement-notice" },
    { ...fixture(), noticeVersion: 4 },
  ];
  for (const input of cases) {
    assert.throws(() => draftDebtValidationEnvelopeAddress(input), /Debt validation envelope blocked:/);
  }
});

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
  assert.doesNotMatch(letter, /Sample Collections\nSample Collections/);
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

test("debt-validation: mailing addresses require a deliverable line and a real postal state", () => {
  const base = fixture();
  // A collector name followed by city/state/ZIP is not a complete destination.
  const noDeliveryLine = "Sample Collections\nAustin, TX 78701";
  const invalidCollector = {
    ...base,
    collectorResponseAddress: noDeliveryLine,
    noticeResponseAddress: noDeliveryLine,
    confirmedRecipientAddress: noDeliveryLine,
  };
  assert.ok(codes(invalidCollector).includes("missing_collector"));
  assert.ok(codes(invalidCollector).includes("missing_notice"));
  assert.ok(codes({ ...base, consumerMailingAddress: "Synthetic Consumer\nSacramento, CA 95814" }).includes("missing_consumer"));

  const invalidState = "Sample Collections\nPO Box 456\nAustin, ZZ 78701";
  const invalidStateIntake = {
    ...base,
    collectorResponseAddress: invalidState,
    noticeResponseAddress: invalidState,
    confirmedRecipientAddress: invalidState,
  };
  assert.ok(codes(invalidStateIntake).includes("missing_collector"));

  // Do not break legitimate USPS rural/highway routes or General Delivery.
  for (const delivery of ["RR 2 BOX 152", "HC 68 BOX 23A", "GENERAL DELIVERY"]) {
    const destination = `Sample Collections\n${delivery}\nAustin, TX 78701`;
    const valid = {
      ...base,
      collectorResponseAddress: destination,
      noticeResponseAddress: destination,
      confirmedRecipientAddress: destination,
    };
    assert.deepEqual(codes(valid), []);
  }
});

test("debt-validation: account numbers and suite-only lines are not postal delivery addresses", () => {
  const base = fixture();
  for (const invalidAddress of [
    "Sample Collections 123\nAustin, TX 78701",
    "Sample Collections\nAccount 123\nAustin, TX 78701",
    "Sample Collections\nSuite 200\nAustin, TX 78701",
  ]) {
    const invalid = {
      ...base,
      collectorResponseAddress: invalidAddress,
      noticeResponseAddress: invalidAddress,
      confirmedRecipientAddress: invalidAddress,
    };
    assert.ok(codes(invalid).includes("missing_collector"), invalidAddress);
    assert.ok(codes(invalid).includes("missing_notice"), invalidAddress);
    assert.throws(() => draftDebtValidationLetter(invalid, "2026-10-30"));
  }
  for (const validAddress of [
    "Sample Collections\n123 Example Street Suite 200\nAustin, TX 78701",
    "Sample Collections\nP.O. Box 456\nAustin, TX 78701",
    "Sample Collections\nRR 2 BOX 152\nAustin, TX 78701",
    "Sample Collections\nGENERAL DELIVERY\nAustin, TX 78701",
  ]) {
    const valid = {
      ...base,
      collectorResponseAddress: validAddress,
      noticeResponseAddress: validAddress,
      confirmedRecipientAddress: validAddress,
    };
    assert.deepEqual(codes(valid), [], validAddress);
  }
});

test("debt-validation: destination requires a city, not just a state and ZIP", () => {
  const base = fixture();
  for (const missingCity of [
    "Sample Collections\nPO Box 456\nTX 78701",
    "Sample Collections\n123 Example Street\nTX 78701",
    "Sample Collections\n123 Example Street\n123, TX 78701",
  ]) {
    const changed = {
      ...base,
      collectorResponseAddress: missingCity,
      noticeResponseAddress: missingCity,
      confirmedRecipientAddress: missingCity,
    };
    assert.ok(codes(changed).includes("missing_collector"), missingCity);
    assert.ok(codes(changed).includes("missing_notice"), missingCity);
    assert.throws(() => draftDebtValidationLetter(changed, "2026-10-30"));
  }

  for (const complete of [
    "Sample Collections\nPO Box 456\nAustin, TX 78701",
    "Sample Collections\n123 Example Street\nSt. Louis, MO 63101",
    "Sample Collections\n123 Example Street\nRio Rancho NM 87124",
  ]) {
    const changed = {
      ...base,
      collectorResponseAddress: complete,
      noticeResponseAddress: complete,
      confirmedRecipientAddress: complete,
    };
    assert.deepEqual(codes(changed), [], complete);
  }
});

test("debt-validation: timing note never presents transcribed or impossible dates as verified notice facts", () => {
  // A browser-entered deadline is not evidence that anyone independently
  // verified the printed notice. Invalid dates must not be repeated as facts,
  // even while intake validation blocks packet generation.
  const transcribed = debtValidationTimingNote(fixture());
  assert.match(transcribed, /2026-11-12/);
  assert.match(transcribed, /not independently verified/i);
  assert.doesNotMatch(transcribed, /The controlling notice states/i);

  const impossible = debtValidationTimingNote({
    ...fixture(), noticeDisputeDeadline: "2026-02-30",
  });
  assert.match(impossible, /invalid/i);
  assert.doesNotMatch(impossible, /2026-02-30/);
  assert.ok(codes({ ...fixture(), noticeDisputeDeadline: "2026-02-30" }).includes("invalid_notice_date"));
});
