import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFilingProofRecord,
  renderFilingProofCertificate,
  updateFilingProofStatus,
} from "../src/filing-proof.ts";

const HASH = "a".repeat(64);

test("filing proof requires cryptographic hashes and provider-backed submission", () => {
  const proof = createFilingProofRecord({
    matterId: "matter-1",
    workflowId: "appeal-insurance-denial",
    packetId: "packet-1",
    packetSha256: HASH,
    attachmentHashes: ["b".repeat(64)],
    recipient: { name: "Appeals Department", line1: "1 Main St", city: "Example", state: "CA", postal: "95501" },
    method: "certified",
  });

  assert.equal(proof.status, "assembled");
  assert.throws(() => updateFilingProofStatus(proof, { status: "submitted" }), /providerOrderId/);

  const submitted = updateFilingProofStatus(proof, {
    status: "submitted",
    providerOrderId: "lob_123",
    occurredAt: "2026-09-17T20:30:00.000Z",
  });
  const mailed = updateFilingProofStatus(submitted, {
    status: "mailed",
    trackingNumber: "9400",
    occurredAt: "2026-09-17T20:31:00.000Z",
  });

  assert.equal(mailed.providerOrderId, "lob_123");
  assert.equal(mailed.trackingNumber, "9400");
  assert.match(renderFilingProofCertificate(mailed), /Packet SHA-256/);
});

test("filing proof preserves postal failure outcomes", () => {
  const proof = createFilingProofRecord({
    matterId: "matter-2",
    workflowId: "appeal-insurance-denial",
    packetId: "packet-2",
    packetSha256: HASH,
    recipient: { name: "Appeals Department", line1: "1 Main St", city: "Example", state: "CA", postal: "95501" },
    method: "certified",
  });
  const submitted = updateFilingProofStatus(proof, { status: "submitted", providerOrderId: "lob_456" });
  const mailed = updateFilingProofStatus(submitted, { status: "mailed" });
  const returned = updateFilingProofStatus(mailed, { status: "returned" });
  assert.equal(returned.status, "returned");
});
