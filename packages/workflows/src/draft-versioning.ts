export type DraftVersionSource =
  | "template"
  | "ai_generated"
  | "user_edited"
  | "ai_assisted";

export interface DraftVersion {
  id: string;
  versionNumber: number;
  content: string;
  sha256: string;
  wordCount: number;
  source: DraftVersionSource;
  createdAt: string;
  validationPassed: boolean | null;
  unresolvedPlaceholders: readonly string[];
}

export interface DraftApprovalState {
  approvedVersionId: string | null;
  approvedDraftSha256: string | null;
  approvalTimestamp: string | null;
  approvedBy: string | null;
  isStale: boolean;
  staleReason: string | null;
}

export interface VersionedDraft {
  versions: readonly DraftVersion[];
  currentVersionId: string | null;
  approval: DraftApprovalState;
}

async function sha256Text(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

export function findDraftPlaceholders(text: string): readonly string[] {
  return [...text.matchAll(/\[[^\]]+\]/g)].map((match) => match[0]);
}

/**
 * Shared draft-history primitive recovered from the legacy Notice Respond
 * runtime. Approval is bound to the exact draft hash; any later content change
 * makes that approval stale and requires explicit re-approval.
 */
export function createVersionedDraft(): VersionedDraft {
  return {
    versions: [],
    currentVersionId: null,
    approval: {
      approvedVersionId: null,
      approvedDraftSha256: null,
      approvalTimestamp: null,
      approvedBy: null,
      isStale: false,
      staleReason: null,
    },
  };
}

export async function addDraftVersion(
  versioned: VersionedDraft,
  content: string,
  source: DraftVersionSource = "template",
  options: { id?: string; createdAt?: string } = {},
): Promise<VersionedDraft> {
  const sha256 = await sha256Text(content);
  const version: DraftVersion = {
    id: options.id ?? crypto.randomUUID(),
    versionNumber: versioned.versions.length + 1,
    content,
    sha256,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    source,
    createdAt: options.createdAt ?? new Date().toISOString(),
    validationPassed: null,
    unresolvedPlaceholders: findDraftPlaceholders(content),
  };

  const approval =
    versioned.approval.approvedDraftSha256 &&
    versioned.approval.approvedDraftSha256 !== sha256
      ? {
          ...versioned.approval,
          isStale: true,
          staleReason: "Draft was modified after approval. Re-approval required.",
        }
      : versioned.approval;

  return {
    versions: [...versioned.versions, version],
    currentVersionId: version.id,
    approval,
  };
}

export function getCurrentDraftVersion(
  versioned: VersionedDraft,
): DraftVersion | null {
  if (!versioned.currentVersionId) return null;
  return (
    versioned.versions.find(
      (version) => version.id === versioned.currentVersionId,
    ) ?? null
  );
}

export function approveCurrentDraftVersion(
  versioned: VersionedDraft,
  approvedBy: string,
  options: { approvedAt?: string } = {},
): VersionedDraft {
  const reviewer = approvedBy.trim();
  if (!reviewer) throw new Error("Draft approval requires approvedBy");

  const current = getCurrentDraftVersion(versioned);
  if (!current) throw new Error("No current draft version to approve.");

  return {
    ...versioned,
    approval: {
      approvedVersionId: current.id,
      approvedDraftSha256: current.sha256,
      approvalTimestamp: options.approvedAt ?? new Date().toISOString(),
      approvedBy: reviewer,
      isStale: false,
      staleReason: null,
    },
  };
}

export function isDraftApprovalValid(versioned: VersionedDraft): boolean {
  if (!versioned.approval.approvedDraftSha256 || versioned.approval.isStale) {
    return false;
  }
  const current = getCurrentDraftVersion(versioned);
  return (
    current !== null &&
    current.sha256 === versioned.approval.approvedDraftSha256 &&
    current.id === versioned.approval.approvedVersionId
  );
}

export function setCurrentDraftValidation(
  versioned: VersionedDraft,
  passed: boolean,
): VersionedDraft {
  if (!versioned.currentVersionId) {
    throw new Error("No current draft version to validate.");
  }
  return {
    ...versioned,
    versions: versioned.versions.map((version) =>
      version.id === versioned.currentVersionId
        ? { ...version, validationPassed: passed }
        : version,
    ),
  };
}

export async function hasDraftContentChanged(
  versioned: VersionedDraft,
  newContent: string,
): Promise<boolean> {
  const current = getCurrentDraftVersion(versioned);
  if (!current) return true;
  return current.sha256 !== (await sha256Text(newContent));
}
