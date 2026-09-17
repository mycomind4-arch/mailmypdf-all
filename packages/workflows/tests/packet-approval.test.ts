import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMaterializedPacketMatchesApproval,
  createImmutablePacketApproval,
} from "../src/approval/packet-approval.js";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

function preview() {
  return {
    packetSha256: hashA,
    responsePages: 2,
    supportingPages: 3,
    manifest: [{
      documentId: "doc-1",
      role: "evidence",
      evidenceKind: "medical_records",
      filename: "records.pdf",
      sha256: hashB,
      pageCount: 3,
    }],
    quote: { totalCents: 1494 },
  };
}

function approval() {
  const current = preview();
  return createImmutablePacketApproval({
    approvalId: "approval-1",
    matterId: "matter-1",
    workflowId: "ssdi-denial",
    preview: current,
    reviewed: { packetSha256: current.packetSha256, totalCents: current.quote.totalCents },
    recipient: {
      name: "Agency",
      line1: "1 Main St",
      city: "Somewhere",
      state: "CA",
      postal: "95521",
    },
    mailClass: "certified",
    approvedBy: "user-1",
    approvedAt: "2026-09-17T00:00:00.000Z",
  });
}

test("accepts an exactly rebuilt packet", () => {
  assert.doesNotThrow(() => assertMaterializedPacketMatchesApproval(approval(), preview()));
});

test("rejects a changed attachment manifest", () => {
  const current = preview();
  current.manifest[0] = { ...current.manifest[0], sha256: "c".repeat(64) };
  assert.throws(
    () => assertMaterializedPacketMatchesApproval(approval(), current),
    /attachment manifest changed/i,
  );
});

test("rejects a changed server price", () => {
  const current = preview();
  current.quote.totalCents += 1;
  assert.throws(
    () => assertMaterializedPacketMatchesApproval(approval(), current),
    /approved price changed/i,
  );
});

test("rejects a changed page count", () => {
  const current = preview();
  current.supportingPages += 1;
  assert.throws(
    () => assertMaterializedPacketMatchesApproval(approval(), current),
    /page count changed/i,
  );
});
