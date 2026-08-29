import assert from "node:assert/strict";
import test from "node:test";
import { createId } from "@mailmypdf/core";
import { InMemoryVoiceToolRegistry } from "../src/index.js";

test("voice registry rejects duplicate tools", () => {
  const registry = new InMemoryVoiceToolRegistry();
  const tool = {
    name: "case.read",
    description: "Read the current case",
    requiresApproval: false,
    execute: async () => ({ ok: true }),
  };
  registry.register(tool);
  assert.throws(() => registry.register(tool), /already registered/);
});

test("voice registry executes a registered tool with session context", async () => {
  const registry = new InMemoryVoiceToolRegistry();
  registry.register({
    name: "case.read",
    description: "Read the current case",
    requiresApproval: false,
    execute: async (_args, context) => ({ caseId: context.caseId }),
  });
  const caseId = createId("case-1");
  const result = await registry.execute(
    { name: "case.read", arguments: {}, approved: false },
    { sessionId: createId("session-1"), ownerId: createId("owner-1"), caseId, transport: "livekit" },
  );
  assert.deepEqual(result, { caseId });
});

test("voice registry blocks consequential tools without approval", async () => {
  const registry = new InMemoryVoiceToolRegistry();
  registry.register({
    name: "mail.send",
    description: "Send a physical mailing",
    requiresApproval: true,
    execute: async () => ({ sent: true }),
  });
  await assert.rejects(
    registry.execute(
      { name: "mail.send", arguments: {}, approved: false },
      { sessionId: createId("session-1"), ownerId: createId("owner-1"), transport: "livekit" },
    ),
    /approval required/,
  );
});
