import assert from "node:assert/strict";
import test from "node:test";
import { evidencePasses, verifyEvidencePacket } from "./evidence.js";

test("rejects a claim whose cited source is absent", () => {
  const issues = verifyEvidencePacket({
    storyId: "story-1",
    sources: [],
    claims: [{ id: "claim-1", text: "Claim", sourceIds: ["missing"], confidence: 0.9 }],
  });
  assert.equal(issues.some((issue) => issue.severity === "error"), true);
});

test("accepts supported claims", () => {
  assert.equal(evidencePasses({
    storyId: "story-1",
    sources: [{ id: "s1", url: "https://example.com", retrievedAt: "2026-09-16T00:00:00Z", sourceType: "web" }],
    claims: [{ id: "c1", text: "Supported", sourceIds: ["s1"], confidence: 1 }],
  }), true);
});
