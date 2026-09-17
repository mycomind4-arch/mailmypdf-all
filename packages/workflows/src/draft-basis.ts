import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "./matter-runtime-client.js";

export interface WorkflowDraftBasis {
  analysisVersion: number;
  analysisDocumentId: string;
  inputVersion: number;
  documentsFingerprint: string;
}

export function workflowDocumentStateFingerprint(
  documents: readonly WorkflowMatterDocument[],
): string {
  const normalized = documents
    .map((document) => ({
      documentId: document.documentId,
      role: document.role,
      evidenceKind: document.evidenceKind,
      included: document.included,
      position: document.position,
      pageCount: document.pageCount,
      securityStatus: document.securityStatus,
      usable: document.usable,
    }))
    .sort((left, right) =>
      left.position - right.position ||
      left.role.localeCompare(right.role) ||
      left.documentId.localeCompare(right.documentId),
    );

  return JSON.stringify(normalized);
}

export function createWorkflowDraftBasis(input: {
  analysis: Pick<WorkflowMatterAnalysis, "version" | "documentId">;
  inputVersion: number;
  documents: readonly WorkflowMatterDocument[];
}): WorkflowDraftBasis {
  if (!Number.isSafeInteger(input.analysis.version) || input.analysis.version < 1) {
    throw new Error("Draft basis requires a positive analysis version");
  }
  if (!input.analysis.documentId.trim()) {
    throw new Error("Draft basis requires an analysis source identity");
  }
  if (!Number.isSafeInteger(input.inputVersion) || input.inputVersion < 1) {
    throw new Error("Draft basis requires a positive input version");
  }

  return Object.freeze({
    analysisVersion: input.analysis.version,
    analysisDocumentId: input.analysis.documentId,
    inputVersion: input.inputVersion,
    documentsFingerprint: workflowDocumentStateFingerprint(input.documents),
  });
}

export function workflowDraftBasisMatches(
  stored: WorkflowDraftBasis | null | undefined,
  current: WorkflowDraftBasis,
): boolean {
  return Boolean(
    stored &&
    stored.analysisVersion === current.analysisVersion &&
    stored.analysisDocumentId === current.analysisDocumentId &&
    stored.inputVersion === current.inputVersion &&
    stored.documentsFingerprint === current.documentsFingerprint,
  );
}
