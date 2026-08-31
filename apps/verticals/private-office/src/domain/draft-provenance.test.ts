import { describe, expect, it } from "vitest";
import { computeDraftHash, isApprovalValid } from "./draft-provenance";

describe("draft provenance: computeDraftHash", () => {
  it("produces a deterministic SHA-256 hex hash", async () => {
    const content = "Test draft content";
    const hash = await computeDraftHash(content);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const hash2 = await computeDraftHash(content);
    expect(hash2).toBe(hash);
  });

  it("produces different hashes for different content", async () => {
    const hashA = await computeDraftHash("Version A");
    const hashB = await computeDraftHash("Version B");
    expect(hashA).not.toBe(hashB);
  });

  it("produces different hashes for same content with trailing whitespace difference", async () => {
    const hashA = await computeDraftHash("Version A");
    const hashB = await computeDraftHash("Version A ");
    expect(hashA).not.toBe(hashB);
  });
});

describe("draft provenance: isApprovalValid", () => {
  it("returns true when current and approved hashes match", () => {
    const hash = "abc123";
    expect(isApprovalValid(hash, hash)).toBe(true);
  });

  it("returns false when hashes differ (draft was modified after approval)", () => {
    expect(isApprovalValid("new-hash", "old-hash")).toBe(false);
  });

  it("returns false when either hash is null", () => {
    expect(isApprovalValid(null, "hash")).toBe(false);
    expect(isApprovalValid("hash", null)).toBe(false);
    expect(isApprovalValid(null, null)).toBe(false);
  });

  it("returns false when either hash is empty string", () => {
    expect(isApprovalValid("", "hash")).toBe(false);
    expect(isApprovalValid("hash", "")).toBe(false);
  });
});

describe("draft version integrity lifecycle", () => {
  it("simulates the full approval invalidation flow", async () => {
    // 1. Generate draft A
    const draftA = "Draft version A content";
    const hashA = await computeDraftHash(draftA);

    // 2. Approve draft A
    const approvedHash = hashA;
    expect(isApprovalValid(hashA, approvedHash)).toBe(true);

    // 3. Draft is modified (new facts, re-run workflow)
    const draftB = "Draft version B content — changed";
    const hashB = await computeDraftHash(draftB);

    // 4. Approval is no longer valid
    expect(isApprovalValid(hashB, approvedHash)).toBe(false);

    // 5. Re-review and approve draft B
    const newApprovedHash = hashB;
    expect(isApprovalValid(hashB, newApprovedHash)).toBe(true);

    // 6. Fulfillment is now permitted
    expect(isApprovalValid(hashB, newApprovedHash)).toBe(true);
  });
});
