/**
 * Draft Versioning Tests
 *
 * Tests version tracking, hash binding, and approval staleness.
 */

import { describe, it, expect } from "vitest";
import {
  createVersionedDraft,
  addDraftVersion,
  approveCurrentVersion,
  isApprovalValid,
  setVersionValidation,
  getCurrentVersion,
  hasContentChanged,
  type VersionedDraft,
} from "../draft-versioning";

describe("Draft Versioning", () => {
  describe("createVersionedDraft", () => {
    it("creates an empty versioned draft", () => {
      const v = createVersionedDraft();
      expect(v.versions).toEqual([]);
      expect(v.currentVersionId).toBeNull();
      expect(v.approval.approvedDraftHash).toBeNull();
      expect(v.approval.isStale).toBe(false);
    });
  });

  describe("addDraftVersion", () => {
    it("adds first version", () => {
      const v = createVersionedDraft();
      const v2 = addDraftVersion(v, "Draft content v1", "template");

      expect(v2.versions).toHaveLength(1);
      expect(v2.versions[0].versionNumber).toBe(1);
      expect(v2.versions[0].content).toBe("Draft content v1");
      expect(v2.versions[0].hash).toBeTruthy();
      expect(v2.versions[0].wordCount).toBe(3);
      expect(v2.versions[0].source).toBe("template");
      expect(v2.currentVersionId).toBe(v2.versions[0].id);
    });

    it("adds second version with incremented number", () => {
      const v = createVersionedDraft();
      const v2 = addDraftVersion(v, "Draft v1", "template");
      const v3 = addDraftVersion(v2, "Draft v2 edited", "user_edited");

      expect(v3.versions).toHaveLength(2);
      expect(v3.versions[1].versionNumber).toBe(2);
      expect(v3.versions[1].source).toBe("user_edited");
      expect(v3.currentVersionId).toBe(v3.versions[1].id);
    });

    it("detects placeholders in draft", () => {
      const v = createVersionedDraft();
      const v2 = addDraftVersion(v, "Dear [NAME], your notice [NUMBER] is ready.");

      expect(v2.versions[0].unresolvedPlaceholders).toEqual(["[NAME]", "[NUMBER]"]);
    });

    it("marks prior approval as stale when content changes", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Original draft", "template");
      v = approveCurrentVersion(v, "user1");
      expect(v.approval.isStale).toBe(false);

      v = addDraftVersion(v, "Modified draft", "user_edited");
      expect(v.approval.isStale).toBe(true);
      expect(v.approval.staleReason).toContain("modified after approval");
    });

    it("does NOT mark approval stale when same content re-added", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Same draft", "template");
      v = approveCurrentVersion(v, "user1");

      v = addDraftVersion(v, "Same draft", "template");
      expect(v.approval.isStale).toBe(false);
    });
  });

  describe("approveCurrentVersion", () => {
    it("approves the current version", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Draft to approve", "template");
      v = approveCurrentVersion(v, "user123");

      expect(v.approval.approvedDraftHash).toBeTruthy();
      expect(v.approval.approvedBy).toBe("user123");
      expect(v.approval.approvalTimestamp).toBeTruthy();
      expect(v.approval.isStale).toBe(false);
    });

    it("throws when no current version", () => {
      const v = createVersionedDraft();
      expect(() => approveCurrentVersion(v, "user")).toThrow("No current draft version");
    });
  });

  describe("isApprovalValid", () => {
    it("returns false when not approved", () => {
      const v = createVersionedDraft();
      expect(isApprovalValid(v)).toBe(false);
    });

    it("returns true after approval", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Approved draft", "template");
      v = approveCurrentVersion(v, "user");
      expect(isApprovalValid(v)).toBe(true);
    });

    it("returns false when stale", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Draft v1", "template");
      v = approveCurrentVersion(v, "user");
      v = addDraftVersion(v, "Draft v2 modified", "user_edited");
      expect(isApprovalValid(v)).toBe(false);
    });
  });

  describe("setVersionValidation", () => {
    it("sets validation result on current version", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Draft", "template");
      v = setVersionValidation(v, true);

      expect(v.versions[0].validationPassed).toBe(true);
    });

    it("does not affect other versions", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Draft 1", "template");
      v = addDraftVersion(v, "Draft 2", "user_edited");
      v = setVersionValidation(v, true);

      expect(v.versions[0].validationPassed).toBeNull();
      expect(v.versions[1].validationPassed).toBe(true);
    });
  });

  describe("getCurrentVersion", () => {
    it("returns null when no versions", () => {
      const v = createVersionedDraft();
      expect(getCurrentVersion(v)).toBeNull();
    });

    it("returns the current version", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "First", "template");
      v = addDraftVersion(v, "Second", "user_edited");
      const current = getCurrentVersion(v);

      expect(current?.content).toBe("Second");
      expect(current?.versionNumber).toBe(2);
    });
  });

  describe("hasContentChanged", () => {
    it("returns true when no existing version", () => {
      const v = createVersionedDraft();
      expect(hasContentChanged(v, "new content")).toBe(true);
    });

    it("returns false when content is identical", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Same content", "template");
      expect(hasContentChanged(v, "Same content")).toBe(false);
    });

    it("returns true when content differs", () => {
      let v = createVersionedDraft();
      v = addDraftVersion(v, "Original", "template");
      expect(hasContentChanged(v, "Modified")).toBe(true);
    });
  });

  describe("Full lifecycle", () => {
    it("version → validate → approve → edit → stale → re-approve", () => {
      let v = createVersionedDraft();

      // Create draft
      v = addDraftVersion(v, "Re: CP2000 Notice\n\nDear IRS, I disagree.", "template");
      expect(getCurrentVersion(v)?.versionNumber).toBe(1);

      // Validate
      v = setVersionValidation(v, true);
      expect(getCurrentVersion(v)?.validationPassed).toBe(true);

      // Approve
      v = approveCurrentVersion(v, "user@example.com");
      expect(isApprovalValid(v)).toBe(true);
      expect(v.approval.approvedBy).toBe("user@example.com");

      // Edit (stale)
      v = addDraftVersion(v, "Re: CP2000 Notice\n\nDear IRS, I disagree with the proposed adjustment.", "user_edited");
      expect(v.approval.isStale).toBe(true);
      expect(isApprovalValid(v)).toBe(false);

      // Re-validate
      v = setVersionValidation(v, true);

      // Re-approve
      v = approveCurrentVersion(v, "user@example.com");
      expect(isApprovalValid(v)).toBe(true);
      expect(v.approval.isStale).toBe(false);
      expect(getCurrentVersion(v)?.versionNumber).toBe(2);
    });
  });
});
