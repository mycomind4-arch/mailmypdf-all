import assert from "node:assert/strict";
import test from "node:test";

import { MemoryAuditRepository, createAuditEvent } from "../src/index";

test("audit events require owner, matter, workflow, and detail", () => {
  assert.throws(() => createAuditEvent({
    ownerId: "",
    matterId: "matter-1",
    workflowId: "workflow-1",
    type: "matter_created",
    actor: { type: "system" },
    detail: "Created",
  }), /ownerId/);
});

test("memory repository is append-only and owner scoped", async () => {
  const repository = new MemoryAuditRepository();
  await repository.append({
    id: "event-1",
    timestamp: "2026-09-17T12:00:00.000Z",
    ownerId: "owner-a",
    matterId: "matter-1",
    workflowId: "workflow-1",
    type: "packet_assembled",
    actor: { type: "system" },
    detail: "Packet assembled",
    artifacts: [{ kind: "packet", id: "packet-1", sha256: "a".repeat(64) }],
  });
  await repository.append({
    id: "event-2",
    timestamp: "2026-09-17T12:01:00.000Z",
    ownerId: "owner-b",
    matterId: "matter-1",
    workflowId: "workflow-1",
    type: "packet_assembled",
    actor: { type: "system" },
    detail: "Other owner's packet",
  });

  const ownerEvents = await repository.listMatter("owner-a", "matter-1");
  assert.equal(ownerEvents.length, 1);
  assert.equal(ownerEvents[0]?.artifacts?.[0]?.sha256, "a".repeat(64));
  assert.equal(await repository.hasEvent("owner-a", "matter-1", "packet_assembled"), true);
  assert.equal(await repository.hasEvent("owner-a", "matter-1", "mailing_submitted"), false);
});

test("duplicate audit ids are rejected", async () => {
  const repository = new MemoryAuditRepository();
  const input = {
    id: "event-1",
    ownerId: "owner-a",
    matterId: "matter-1",
    workflowId: "workflow-1",
    type: "matter_created" as const,
    actor: { type: "user" as const, id: "owner-a" },
    detail: "Matter created",
  };
  await repository.append(input);
  await assert.rejects(() => repository.append(input), /already exists/);
});
