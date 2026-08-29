import assert from "node:assert/strict";
import test from "node:test";
import { composeDomainPack } from "../src/domain-pack-composer.js";
import type { DomainPack, StageResult } from "../src/gold-standard-pipeline.js";

const result = (stage: StageResult["stage"]): StageResult => ({ stage, status: "passed", messages: [stage] });

const pack = (id: string, overrides: Partial<DomainPack> = {}): DomainPack => ({
  id,
  security: async () => result("security"), classify: async () => result("classification"), extract: async () => result("extraction"),
  understand: async () => result("understand"), facts: async () => result("facts"), provenance: async () => result("provenance"),
  timeline: async () => result("timeline"), deadlines: async () => result("deadline"), requirements: async () => result("requirements"),
  contradictions: async () => result("contradiction"), findings: async () => result("findings"), discrepancies: async () => result("discrepancy"),
  evidence: async () => result("evidence"), research: async () => result("research"), risk: async () => result("risk"), strategy: async () => result("strategy"),
  draft: async () => result("draft"), draftProvenance: async () => result("draftProvenance"), validation: async () => result("validation"),
  review: async () => result("review"), approval: async () => result("approval"), mailing: async () => result("mailing"), tracking: async () => result("tracking"),
  proofAudit: async () => result("proofAudit"), ...overrides,
});

test("domain pack composition uses the first concrete implementation", async () => {
  const first = pack("first", { research: async () => ({ stage: "research", status: "passed", messages: ["first"] }) });
  const second = pack("second", { research: async () => ({ stage: "research", status: "passed", messages: ["second"] }) });
  const composed = composeDomainPack([first, second]);
  const output = await composed.research({ documents: [] }, []);
  assert.deepEqual(output.messages, ["first"]);
});

test("composition fails closed when no pack implements a required stage", async () => {
  const first = pack("first", { research: undefined });
  const composed = composeDomainPack([first]);
  const output = await composed.research({ documents: [] }, []);
  assert.equal(output.status, "failed");
  assert.match(output.messages[0], /No registered domain pack implements required stage/);
});
