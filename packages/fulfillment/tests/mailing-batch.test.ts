import assert from "node:assert/strict";
import test from "node:test";
import { createMailingBatchManifest, hashMailingBatchManifest } from "../src/mailing-batch.js";

const sender = { name: "Sender", line1: "1 Main St", city: "Eureka", state: "CA", postal: "95501" };
const recipient = (id: string, hash: string) => ({
  id,
  address: { name: id, line1: "2 Main St", city: "Eureka", state: "CA", postal: "95501" },
  packetSha256: hash,
  pageCount: 2,
});

test("identical batch requires one immutable packet across recipients", async () => {
  const hash = "a".repeat(64);
  const manifest = createMailingBatchManifest({
    id: "batch-1", ownerId: "user-1", mode: "identical", mailClass: "standard",
    color: false, sender, recipients: [recipient("r1", hash), recipient("r2", hash)],
    createdAt: "2026-09-28T02:00:00.000Z",
  });
  assert.equal(manifest.recipients.length, 2);
  assert.match(await hashMailingBatchManifest(manifest), /^[0-9a-f]{64}$/);
});

test("personalized batch permits recipient-specific packet hashes", () => {
  const manifest = createMailingBatchManifest({
    id: "batch-2", ownerId: "user-1", mode: "personalized", mailClass: "certified",
    color: false, sender,
    recipients: [recipient("r1", "a".repeat(64)), recipient("r2", "b".repeat(64))],
  });
  assert.notEqual(manifest.recipients[0]!.packetSha256, manifest.recipients[1]!.packetSha256);
});

test("identical batch fails when packet hashes differ", () => {
  assert.throws(() => createMailingBatchManifest({
    id: "batch-3", ownerId: "user-1", mode: "identical", mailClass: "standard",
    color: false, sender,
    recipients: [recipient("r1", "a".repeat(64)), recipient("r2", "b".repeat(64))],
  }), /same packet hash/i);
});

test("batch recipient ids must be unique", () => {
  const hash = "a".repeat(64);
  assert.throws(() => createMailingBatchManifest({
    id: "batch-4", ownerId: "user-1", mode: "identical", mailClass: "standard",
    color: false, sender,
    recipients: [recipient("r1", hash), recipient("r1", hash)],
  }), /Duplicate batch recipient id/);
});
