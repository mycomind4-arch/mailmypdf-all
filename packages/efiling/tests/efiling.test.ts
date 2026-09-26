import assert from "node:assert/strict";
import test from "node:test";
import { assertFilingAccepted, InMemoryFilingProvider, isFilingAccepted } from "../src/index.js";
import type { FilingSubmissionRequest } from "../src/index.js";

const PACKET_SHA = "c".repeat(64);

function baseRequest(overrides: Partial<FilingSubmissionRequest> = {}): FilingSubmissionRequest {
  return {
    matterId: "matter-1",
    packetId: "packet-1",
    packetSha256: PACKET_SHA,
    jurisdiction: { kind: "agency", name: "California Secretary of State", region: "CA" },
    now: "2026-09-26T00:00:00.000Z",
    ...overrides,
  };
}

test("submit rejects malformed input", async () => {
  const provider = new InMemoryFilingProvider();
  await assert.rejects(() => provider.submit(baseRequest({ packetSha256: "not-a-hash" })));
  await assert.rejects(() => provider.submit(baseRequest({ jurisdiction: { kind: "agency", name: "", region: "CA" } })));
  await assert.rejects(() =>
    provider.submit(baseRequest({ jurisdiction: { kind: "court", name: "Superior Court", region: "CA" } })),
  );
});

test("a court filing with a case number is accepted as valid input", async () => {
  const provider = new InMemoryFilingProvider();
  const submission = await provider.submit(
    baseRequest({ jurisdiction: { kind: "court", name: "Superior Court", region: "CA", caseNumber: "CV-1234" } }),
  );
  assert.equal(submission.status, "pending");
});

test("full happy path: submitted then accepted", async () => {
  const provider = new InMemoryFilingProvider();
  const submission = await provider.submit(baseRequest());
  assert.equal(isFilingAccepted(submission), false);

  const submitted = await provider.simulateSubmitted(submission.id, "provider-ref-1", "2026-09-26T00:01:00.000Z");
  assert.equal(submitted.status, "submitted");

  const accepted = await provider.simulateAccepted(submission.id, "conf-123", "2026-09-26T00:02:00.000Z");
  assert.equal(accepted.status, "accepted");
  assert.equal(isFilingAccepted(accepted), true);
  assert.doesNotThrow(() => assertFilingAccepted(accepted));
});

test("cannot be accepted before it has been submitted", async () => {
  const provider = new InMemoryFilingProvider();
  const submission = await provider.submit(baseRequest());
  await assert.rejects(() => provider.simulateAccepted(submission.id, "conf-123", "2026-09-26T00:01:00.000Z"));
});

test("a rejected submission is terminal — no further events allowed", async () => {
  const provider = new InMemoryFilingProvider();
  const submission = await provider.submit(baseRequest());
  await provider.simulateSubmitted(submission.id, "provider-ref-1", "2026-09-26T00:01:00.000Z");
  const rejected = await provider.simulateRejected(submission.id, "MISSING_FEE", "Filing fee not included", "2026-09-26T00:02:00.000Z");
  assert.equal(rejected.status, "rejected");
  assert.equal(isFilingAccepted(rejected), false);
  await assert.rejects(() => provider.simulateAccepted(submission.id, "conf-123", "2026-09-26T00:03:00.000Z"));
});

test("a voided submission cannot later be submitted or accepted", async () => {
  const provider = new InMemoryFilingProvider();
  const submission = await provider.submit(baseRequest());
  const voided = await provider.voidSubmission(submission.id, "wrong packet attached", "2026-09-26T00:01:00.000Z");
  assert.equal(voided.status, "voided");
  await assert.rejects(() => provider.simulateSubmitted(submission.id, "provider-ref-1", "2026-09-26T00:02:00.000Z"));
});
