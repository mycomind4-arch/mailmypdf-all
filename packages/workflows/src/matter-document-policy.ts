import type { WorkflowMatterDocument } from "./matter-runtime-client.js";
import { WorkflowRuntimeError } from "./matter-runtime.js";

export interface MatterAttachmentInput {
  documentId: string;
  role: "subject_notice" | "evidence";
  evidenceKind?: string | null;
  position?: number;
}

export function validateMatterAttachment(input: MatterAttachmentInput): void {
  if (!input.documentId.trim()) {
    throw new WorkflowRuntimeError("documentId is required", "DOCUMENT_ID_REQUIRED");
  }
  if (input.role === "evidence" && !input.evidenceKind?.trim()) {
    throw new WorkflowRuntimeError(
      "Supporting evidence must declare what kind of document it is",
      "EVIDENCE_KIND_REQUIRED",
    );
  }
  if (input.role === "subject_notice" && input.evidenceKind) {
    throw new WorkflowRuntimeError(
      "The source document cannot also be classified as supporting evidence",
      "SOURCE_EVIDENCE_KIND_INVALID",
    );
  }
  if (input.position !== undefined &&
      (!Number.isInteger(input.position) || input.position < 0 || input.position > 500)) {
    throw new WorkflowRuntimeError("Document position is invalid", "DOCUMENT_POSITION_INVALID");
  }
}

/**
 * Applies the old secure-core attachment semantics to the generic matter model:
 * one source notice, evidence enclosed by default, source excluded by default.
 */
export function attachMatterDocument(
  existing: readonly WorkflowMatterDocument[],
  described: Omit<WorkflowMatterDocument, "id" | "documentId" | "role" | "evidenceKind" | "included" | "position">,
  input: MatterAttachmentInput,
  id: string,
): WorkflowMatterDocument[] {
  validateMatterAttachment(input);
  if (existing.some((document) => document.documentId === input.documentId)) {
    throw new WorkflowRuntimeError("That document is already attached to this matter", "DOCUMENT_ALREADY_ATTACHED");
  }

  const next: WorkflowMatterDocument = {
    id,
    documentId: input.documentId,
    role: input.role,
    evidenceKind: input.role === "evidence" ? input.evidenceKind ?? null : null,
    included: input.role === "evidence",
    position: input.position ?? existing.length,
    ...described,
  };

  return input.role === "subject_notice"
    ? [...existing.filter((document) => document.role !== "subject_notice"), next]
    : [...existing, next];
}

export function setMatterDocumentIncluded(
  documents: readonly WorkflowMatterDocument[],
  documentId: string,
  included: boolean,
): WorkflowMatterDocument[] {
  let found = false;
  const updated = documents.map((document) => {
    if (document.documentId !== documentId) return document;
    found = true;
    if (document.role === "subject_notice" && included) {
      throw new WorkflowRuntimeError(
        "The source notice is analysis input and is not automatically mailed as evidence",
        "SOURCE_DOCUMENT_CANNOT_BE_INCLUDED",
      );
    }
    return { ...document, included };
  });
  if (!found) throw new WorkflowRuntimeError("Document is not attached to this matter", "DOCUMENT_NOT_ATTACHED");
  return updated;
}

export function reorderMatterDocument(
  documents: readonly WorkflowMatterDocument[],
  documentId: string,
  position: number,
): WorkflowMatterDocument[] {
  if (!Number.isInteger(position) || position < 0 || position > 500) {
    throw new WorkflowRuntimeError("Document position is invalid", "DOCUMENT_POSITION_INVALID");
  }
  let found = false;
  const updated = documents.map((document) => {
    if (document.documentId !== documentId) return document;
    found = true;
    return { ...document, position };
  });
  if (!found) throw new WorkflowRuntimeError("Document is not attached to this matter", "DOCUMENT_NOT_ATTACHED");
  return updated;
}
