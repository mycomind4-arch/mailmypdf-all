import {
  createHttpWorkflowMatterClient,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";

const client = createHttpWorkflowMatterClient({
  basePath: "/api/workflow-runtime",
});

export type MailingAddress = WorkflowMailingAddress;
export type PacketPreview = WorkflowPacketPreview;
export type WorkflowAnalysis = WorkflowMatterAnalysis;

export type WorkflowCaseDocument = {
  id: string;
  document_id: string;
  role: "subject_notice" | "evidence";
  evidence_kind: string | null;
  page_count: number | null;
  included: boolean;
  position: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  security_status: string;
  usable: boolean;
};

function toCaseDocument(document: WorkflowMatterDocument): WorkflowCaseDocument {
  return {
    id: document.id,
    document_id: document.documentId,
    role: document.role,
    evidence_kind: document.evidenceKind,
    page_count: document.pageCount,
    included: document.included,
    position: document.position,
    filename: document.filename,
    mime_type: document.mimeType,
    size_bytes: document.sizeBytes,
    security_status: document.securityStatus,
    usable: document.usable,
  };
}

function toCaseDocuments(documents: WorkflowMatterDocument[]): WorkflowCaseDocument[] {
  return documents.map(toCaseDocument);
}

export async function createWorkflowCase(workflowId: string, verticalId: string) {
  const matter = await client.createMatter({ workflowId, verticalId });
  return {
    id: matter.id,
    workflow_id: matter.workflowId,
    vertical_id: matter.verticalId,
    status: matter.status,
    created_at: matter.createdAt,
    updated_at: matter.updatedAt,
  };
}

export async function loadWorkflowCase(matterId: string) {
  const snapshot = await client.loadMatter(matterId);
  return {
    case: snapshot.matter,
    documents: toCaseDocuments(snapshot.documents),
  };
}

export async function uploadSecureWorkflowDocument(input: {
  file: File;
  workflowId: string;
  purpose: string;
}) {
  return client.uploadDocument(input);
}

export async function attachWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  role: "subject_notice" | "evidence";
  evidenceKind?: string | null;
  position?: number;
}) {
  const documents = await client.attachDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    role: input.role,
    evidenceKind: input.evidenceKind,
    position: input.position,
  });
  return toCaseDocuments(documents);
}

export async function updateWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  included?: boolean;
  position?: number;
}) {
  const documents = await client.updateDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    included: input.included,
    position: input.position,
  });
  return toCaseDocuments(documents);
}

export async function detachWorkflowDocument(caseId: string, documentId: string) {
  return toCaseDocuments(await client.detachDocument(caseId, documentId));
}

export function analyzeWorkflowCase(caseId: string) {
  return client.analyze(caseId);
}

export function loadWorkflowAnalysis(caseId: string) {
  return client.loadAnalysis(caseId);
}

export function saveWorkflowInput(caseId: string, input: Record<string, unknown>) {
  return client.saveInput(caseId, input);
}

export function loadWorkflowInput(caseId: string) {
  return client.loadInput(caseId);
}

export function generateWorkflowDraft(caseId: string) {
  return client.generateDraft(caseId);
}

export function saveWorkflowDraft(caseId: string, bodyText: string) {
  return client.saveDraft(caseId, bodyText);
}

export function loadWorkflowDraft(caseId: string) {
  return client.loadDraft(caseId);
}

export function previewWorkflowPacket(
  caseId: string,
  mailClass: "standard" | "certified" | "registered",
) {
  return client.previewPacket(caseId, mailClass);
}

export function approveWorkflowPacket(input: {
  caseId: string;
  preview: PacketPreview;
  recipient: MailingAddress;
  mailClass: "standard" | "certified" | "registered";
}) {
  return client.approvePacket({
    matterId: input.caseId,
    preview: input.preview,
    recipient: input.recipient,
    mailClass: input.mailClass,
  });
}

export function loadWorkflowApproval(caseId: string) {
  return client.loadApproval(caseId);
}

export function checkoutWorkflowCase(input: {
  caseId: string;
  approvalId: string;
  sender: MailingAddress;
}) {
  return client.checkout({
    matterId: input.caseId,
    approvalId: input.approvalId,
    sender: input.sender,
  });
}
