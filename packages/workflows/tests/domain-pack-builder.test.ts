import assert from "node:assert/strict";
import test from "node:test";
import { buildDomainPack } from "../src/domain-pack-builder.js";

const passed = (stage: any) => ({ stage, status: "passed" as const, messages: [] });

test("domain pack builder preserves supplied handlers", async () => {
  const pack = buildDomainPack("test", {
    research: async () => passed("research"),
  });
  const result = await pack.research({ documents: [] }, []);
  assert.equal(result.status, "passed");
});

test("domain pack builder fails closed for omitted handlers", async () => {
  const pack = buildDomainPack("test", {});
  const result = await pack.research({ documents: [] }, []);
  assert.equal(result.status, "failed");
  assert.match(result.messages[0], /does not implement required stage 'research'/);
});

test("initial handlers receive only the input", async () => {
  let seen = false;
  const pack = buildDomainPack("test", {
    security: async (input) => {
      seen = Array.isArray(input.documents);
      return passed("security");
    },
  });
  await pack.security({ documents: [] });
  assert.equal(seen, true);
});
