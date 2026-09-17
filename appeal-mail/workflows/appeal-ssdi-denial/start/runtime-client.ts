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
export type WorkflowCaseDocument = WorkflowMatterDocument;

export async function createWorkflowCase(workflowId: string, verticalId: string) {
  return client.createMatter({ workflowId, verticalId });
}

export async function loadWorkflowCase(matterId: string) {
  const snapshot = await client.loadMatter(matterId);
  return { case: snapshot.matter, documents: snapshot.documents };
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
  return client.attachDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    role: input.role,
    evidenceKind: input.evidenceKind,
    position: input.position,
  });
}

export async function updateWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  included?: boolean;
  position?: number;
}) {
  return client.updateDocument({
    matterId: input.caseId,
    documentId: input.documentId,
    included: input.included,
    position: input.position,
  });
}

export function detachWorkflowDocument(caseId: string, documentId: string) {
  return client.detachDocument(caseId, documentId);
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
