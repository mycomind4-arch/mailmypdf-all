import {
  createHttpWorkflowMatterClient,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";

const client = createHttpWorkflowMatterClient({ basePath: "/api/workflow-runtime" });

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
  return client.createMatter({ workflowId, verticalId });
}

export async function loadWorkflowCase(matterId: string) {
  const snapshot = await client.loadMatter(matterId);
  return { case: snapshot.matter, documents: toCaseDocuments(snapshot.documents) };
}

export function uploadSecureWorkflowDocument(input: { file: File; workflowId: string; purpose: string }) {
  return client.uploadDocument(input);
}

export async function attachWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  role: "subject_notice" | "evidence";
  evidenceKind?: string | null;
  position?: number;
}) {
  return toCaseDocuments(await client.attachDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    role: input.role,
    evidenceKind: input.evidenceKind,
    position: input.position,
  }));
}

export async function updateWorkflowDocument(input: { caseId: string; documentId: string; included?: boolean; position?: number }) {
  return toCaseDocuments(await client.updateDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    included: input.included,
    position: input.position,
  }));
}

export async function detachWorkflowDocument(caseId: string, documentId: string) {
  return toCaseDocuments(await client.detachDocument(caseId, documentId));
}

export const analyzeWorkflowCase = (caseId: string) => client.analyze(caseId);
export const loadWorkflowAnalysis = (caseId: string) => client.loadAnalysis(caseId);
export const saveWorkflowInput = (caseId: string, input: Record<string, unknown>) => client.saveInput(caseId, input);
export const loadWorkflowInput = (caseId: string) => client.loadInput(caseId);
export const generateWorkflowDraft = (caseId: string) => client.generateDraft(caseId);
export const saveWorkflowDraft = (caseId: string, bodyText: string) => client.saveDraft(caseId, bodyText);
export const loadWorkflowDraft = (caseId: string) => client.loadDraft(caseId);
export const previewWorkflowPacket = (caseId: string, mailClass: "standard" | "certified" | "registered") => client.previewPacket(caseId, mailClass);
export const approveWorkflowPacket = (input: { caseId: string; preview: PacketPreview; recipient: MailingAddress; mailClass: "standard" | "certified" | "registered" }) => client.approvePacket({ matterId: input.caseId, preview: input.preview, recipient: input.recipient, mailClass: input.mailClass });
export const loadWorkflowApproval = (caseId: string) => client.loadApproval(caseId);
export const checkoutWorkflowCase = (input: { caseId: string; approvalId: string; sender: MailingAddress }) => client.checkout({ matterId: input.caseId, approvalId: input.approvalId, sender: input.sender });
