/**
 * Draft Versioning — tracks draft versions with cryptographic hashes.
 *
 * When the user edits a draft, prior approval becomes stale.
 * Approval binds to the exact draft content via SHA-256 hash.
 */

import { sha256 } from "@/platform/fulfillment-adapter";

export interface DraftVersion {
  id: string;
  versionNumber: number;
  content: string;
  hash: string;
  wordCount: number;
  source: "template" | "ai_generated" | "user_edited" | "ai_assisted";
  createdAt: string;
  validationPassed: boolean | null;
  unresolvedPlaceholders: string[];
}

export interface DraftApprovalState {
  approvedVersionId: string | null;
  approvedDraftHash: string | null;
  approvalTimestamp: string | null;
  approvedBy: string | null;
  isStale: boolean;
  staleReason: string | null;
}

export interface VersionedDraft {
  versions: DraftVersion[];
  currentVersionId: string | null;
  approval: DraftApprovalState;
}

// ── Factory ──────────────────────────────────────────────────

export function createVersionedDraft(): VersionedDraft {
  return {
    versions: [],
    currentVersionId: null,
    approval: {
      approvedVersionId: null,
      approvedDraftHash: null,
      approvalTimestamp: null,
      approvedBy: null,
      isStale: false,
      staleReason: null,
    },
  };
}

// ── Add a new version ────────────────────────────────────────

export function addDraftVersion(
  versioned: VersionedDraft,
  content: string,
  source: DraftVersion["source"] = "template",
): VersionedDraft {
  const hash = sha256(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const placeholders = findPlaceholders(content);

  const version: DraftVersion = {
    id: crypto.randomUUID(),
    versionNumber: versioned.versions.length + 1,
    content,
    hash,
    wordCount,
    source,
    createdAt: new Date().toISOString(),
    validationPassed: null,
    unresolvedPlaceholders: placeholders,
  };

  // Check if this invalidates prior approval
  let approval = versioned.approval;
  if (approval.approvedDraftHash && approval.approvedDraftHash !== hash) {
    approval = {
      ...approval,
      isStale: true,
      staleReason: "Draft was modified after approval. Re-approval required.",
    };
  }

  return {
    versions: [...versioned.versions, version],
    currentVersionId: version.id,
    approval,
  };
}

// ── Approve current version ──────────────────────────────────

export function approveCurrentVersion(
  versioned: VersionedDraft,
  approvedBy: string,
): VersionedDraft {
  if (!versioned.currentVersionId) {
    throw new Error("No current draft version to approve.");
  }

  const current = versioned.versions.find((v) => v.id === versioned.currentVersionId);
  if (!current) {
    throw new Error("Current draft version not found.");
  }

  return {
    ...versioned,
    approval: {
      approvedVersionId: current.id,
      approvedDraftHash: current.hash,
      approvalTimestamp: new Date().toISOString(),
      approvedBy,
      isStale: false,
      staleReason: null,
    },
  };
}

// ── Check if approval is valid ───────────────────────────────

export function isApprovalValid(versioned: VersionedDraft): boolean {
  if (!versioned.approval.approvedDraftHash) return false;
  if (versioned.approval.isStale) return false;

  const current = versioned.versions.find((v) => v.id === versioned.currentVersionId);
  if (!current) return false;

  return current.hash === versioned.approval.approvedDraftHash;
}

// ── Set validation result on current version ─────────────────

export function setVersionValidation(
  versioned: VersionedDraft,
  passed: boolean,
): VersionedDraft {
  return {
    ...versioned,
    versions: versioned.versions.map((v) =>
      v.id === versioned.currentVersionId
        ? { ...v, validationPassed: passed }
        : v,
    ),
  };
}

// ── Get current version ───────────────────────────────────────

export function getCurrentVersion(versioned: VersionedDraft): DraftVersion | null {
  if (!versioned.currentVersionId) return null;
  return versioned.versions.find((v) => v.id === versioned.currentVersionId) ?? null;
}

// ── Placeholder detection ─────────────────────────────────────

function findPlaceholders(text: string): string[] {
  const placeholders: string[] = [];
  const pattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    placeholders.push(match[0]);
  }
  return placeholders;
}

// ── Check if content has changed ──────────────────────────────

export function hasContentChanged(
  versioned: VersionedDraft,
  newContent: string,
): boolean {
  const current = getCurrentVersion(versioned);
  if (!current) return true;
  return current.hash !== sha256(newContent);
}
