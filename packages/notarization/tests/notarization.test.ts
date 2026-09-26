import assert from "node:assert/strict";
import test from "node:test";
import { assertNotarized, InMemoryNotaryProvider, isNotarized } from "../src/index.js";
import type { NotarizationSessionRequest } from "../src/index.js";

const DOC_SHA = "b".repeat(64);

function baseRequest(overrides: Partial<NotarizationSessionRequest> = {}): NotarizationSessionRequest {
  return {
    documentId: "doc-1",
    documentSha256: DOC_SHA,
    verifiedSignerIdentity: { name: "Jordan Party", verifiedAt: "2026-09-26T00:00:00.000Z" },
    now: "2026-09-26T00:01:00.000Z",
    ...overrides,
  };
}

test("createSession rejects malformed input", async () => {
  const provider = new InMemoryNotaryProvider();
  await assert.rejects(() => provider.createSession(baseRequest({ documentSha256: "not-a-hash" })));
  await assert.rejects(() => provider.createSession(baseRequest({ verifiedSignerIdentity: { name: "", verifiedAt: "" } })));
  await assert.rejects(() => provider.createSession(baseRequest({ expiresAt: "2020-01-01T00:00:00.000Z" })));
});

test("a full attestation notarizes the session", async () => {
  const provider = new InMemoryNotaryProvider();
  const session = await provider.createSession(baseRequest());
  assert.equal(session.status, "pending");
  assert.equal(isNotarized(session), false);

  const notarized = await provider.simulateAttestation(session.id, {
    notaryName: "Pat Notary",
    notaryCommissionNumber: "NC-12345",
    notaryJurisdiction: "CA",
    sealedAt: "2026-09-26T00:05:00.000Z",
    journalEntryId: "journal-1",
  });

  assert.equal(notarized.status, "notarized");
  assert.equal(isNotarized(notarized), true);
  assert.doesNotThrow(() => assertNotarized(notarized));
});

test("attestation requires a journal entry id", async () => {
  const provider = new InMemoryNotaryProvider();
  const session = await provider.createSession(baseRequest());
  await assert.rejects(() =>
    provider.simulateAttestation(session.id, {
      notaryName: "Pat Notary",
      notaryCommissionNumber: "NC-12345",
      notaryJurisdiction: "CA",
      sealedAt: "2026-09-26T00:05:00.000Z",
      journalEntryId: "",
    }),
  );
});

test("a declined or voided session cannot later be notarized", async () => {
  const provider = new InMemoryNotaryProvider();

  const declineSession = await provider.createSession(baseRequest());
  const declined = await provider.simulateDecline(declineSession.id, "signer did not appear", "2026-09-26T00:05:00.000Z");
  assert.equal(declined.status, "declined");
  await assert.rejects(() =>
    provider.simulateAttestation(declineSession.id, {
      notaryName: "Pat Notary",
      notaryCommissionNumber: "NC-12345",
      notaryJurisdiction: "CA",
      sealedAt: "2026-09-26T00:06:00.000Z",
      journalEntryId: "journal-2",
    }),
  );

  const voidSession = await provider.createSession(baseRequest());
  const voided = await provider.voidSession(voidSession.id, "wrong document attached", "2026-09-26T00:05:00.000Z");
  assert.equal(voided.status, "voided");
});

test("an expired session rejects attestation", async () => {
  const provider = new InMemoryNotaryProvider();
  const session = await provider.createSession(baseRequest({ expiresAt: "2026-09-26T00:02:00.000Z" }));
  await assert.rejects(() =>
    provider.simulateAttestation(session.id, {
      notaryName: "Pat Notary",
      notaryCommissionNumber: "NC-12345",
      notaryJurisdiction: "CA",
      sealedAt: "2026-09-26T00:10:00.000Z",
      journalEntryId: "journal-3",
    }),
  );
});
