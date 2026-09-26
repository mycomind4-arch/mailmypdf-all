import assert from "node:assert/strict";
import test from "node:test";
import {
  applySignatureEvent,
  assertSignatureComplete,
  createSignatureRequest,
  InMemorySignatureProvider,
  isSignatureEnvelopeComplete,
} from "../src/index.js";

const DOC_SHA = "a".repeat(64);
const FIELD = { page: 1, x: 10, y: 10, width: 100, height: 40 };

function baseRequest(overrides: Partial<Parameters<typeof createSignatureRequest>[0]> = {}) {
  return createSignatureRequest({
    documentId: "doc-1",
    documentSha256: DOC_SHA,
    signers: [{ signer: { id: "s1", name: "Alex Signer", email: "alex@example.com" }, field: FIELD }],
    now: "2026-09-26T00:00:00.000Z",
    ...overrides,
  });
}

test("createSignatureRequest rejects malformed input", () => {
  assert.throws(() => baseRequest({ documentSha256: "not-a-hash" }));
  assert.throws(() => baseRequest({ signers: [] }));
  assert.throws(() =>
    baseRequest({
      signers: [
        { signer: { id: "s1", name: "A", email: "a@example.com" }, field: FIELD },
        { signer: { id: "s1", name: "B", email: "b@example.com" }, field: FIELD },
      ],
    }),
  );
  assert.throws(() =>
    baseRequest({
      signers: [
        { signer: { id: "s1", name: "A", email: "dup@example.com" }, field: FIELD },
        { signer: { id: "s2", name: "B", email: "dup@example.com" }, field: FIELD },
      ],
    }),
  );
  assert.throws(() => baseRequest({ signers: [{ signer: { id: "s1", name: "A", email: "a@example.com" }, field: { ...FIELD, page: 0 } }] }));
  assert.throws(() => baseRequest({ expiresAt: "2020-01-01T00:00:00.000Z" }));
});

test("full single-signer happy path completes the envelope", async () => {
  const provider = new InMemorySignatureProvider();
  const request = baseRequest();
  const envelope = await provider.createEnvelope(request, request.createdAt);

  assert.equal(envelope.status, "pending");
  assert.equal(isSignatureEnvelopeComplete(envelope), false);

  const signed = await provider.simulateSign(
    envelope.id,
    "s1",
    { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:05:00.000Z" },
    "2026-09-26T00:05:00.000Z",
  );

  assert.equal(signed.status, "completed");
  assert.equal(isSignatureEnvelopeComplete(signed), true);
  assert.equal(signed.completedAt, "2026-09-26T00:05:00.000Z");
  assert.doesNotThrow(() => assertSignatureComplete(signed));
});

test("multi-signer envelope stays pending until every signer has signed", async () => {
  const provider = new InMemorySignatureProvider();
  const request = createSignatureRequest({
    documentId: "doc-2",
    documentSha256: DOC_SHA,
    signers: [
      { signer: { id: "s1", name: "A", email: "a@example.com" }, field: FIELD },
      { signer: { id: "s2", name: "B", email: "b@example.com" }, field: FIELD },
    ],
    now: "2026-09-26T00:00:00.000Z",
  });
  const envelope = await provider.createEnvelope(request, request.createdAt);

  const consent = { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:05:00.000Z" };
  const afterFirst = await provider.simulateSign(envelope.id, "s1", consent, "2026-09-26T00:05:00.000Z");
  assert.equal(afterFirst.status, "pending");
  assert.throws(() => assertSignatureComplete(afterFirst));

  const afterSecond = await provider.simulateSign(envelope.id, "s2", consent, "2026-09-26T00:06:00.000Z");
  assert.equal(afterSecond.status, "completed");
});

test("a signer without affirmative consent cannot sign", async () => {
  const provider = new InMemorySignatureProvider();
  const request = baseRequest();
  const envelope = await provider.createEnvelope(request, request.createdAt);

  await assert.rejects(() =>
    provider.simulateSign(
      envelope.id,
      "s1",
      { intentToSign: false, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:05:00.000Z" },
      "2026-09-26T00:05:00.000Z",
    ),
  );
});

test("a declined, voided, or expired envelope rejects further events", async () => {
  const provider = new InMemorySignatureProvider();

  const declineRequest = baseRequest();
  const declineEnvelope = await provider.createEnvelope(declineRequest, declineRequest.createdAt);
  const declined = await provider.simulateDecline(declineEnvelope.id, "s1", "changed my mind", "2026-09-26T00:05:00.000Z");
  assert.equal(declined.status, "declined");
  await assert.rejects(() =>
    provider.simulateSign(
      declined.id,
      "s1",
      { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:06:00.000Z" },
      "2026-09-26T00:06:00.000Z",
    ),
  );

  const voidRequest = baseRequest();
  const voidEnvelope = await provider.createEnvelope(voidRequest, voidRequest.createdAt);
  const voided = await provider.voidEnvelope(voidEnvelope.id, "sent to wrong recipient", "2026-09-26T00:05:00.000Z");
  assert.equal(voided.status, "voided");

  const expiringRequest = baseRequest({ expiresAt: "2026-09-26T00:10:00.000Z" });
  const expiringEnvelope = await provider.createEnvelope(expiringRequest, expiringRequest.createdAt);
  await assert.rejects(() =>
    provider.simulateSign(
      expiringEnvelope.id,
      "s1",
      { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:20:00.000Z" },
      "2026-09-26T00:20:00.000Z",
    ),
  );
});

test("a signer cannot sign twice", async () => {
  const provider = new InMemorySignatureProvider();
  const request = baseRequest();
  const envelope = await provider.createEnvelope(request, request.createdAt);
  const consent = { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:05:00.000Z" };
  await provider.simulateSign(envelope.id, "s1", consent, "2026-09-26T00:05:00.000Z");
  await assert.rejects(() => provider.simulateSign(envelope.id, "s1", consent, "2026-09-26T00:06:00.000Z"));
});

test("applySignatureEvent rejects unknown signer ids", () => {
  const request = baseRequest();
  const envelope = {
    id: "env_x",
    documentId: request.documentId,
    documentSha256: request.documentSha256,
    signers: request.signers,
    status: "pending" as const,
    events: [{ type: "created" as const, at: request.createdAt }],
    createdAt: request.createdAt,
  };
  assert.throws(() =>
    applySignatureEvent(envelope, {
      type: "signed",
      at: "2026-09-26T00:05:00.000Z",
      signerId: "not-a-signer",
      consent: { intentToSign: true, consentedToElectronicRecords: true, consentedAt: "2026-09-26T00:05:00.000Z" },
    }),
  );
});
