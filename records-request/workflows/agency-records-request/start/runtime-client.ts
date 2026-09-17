import {
  createHttpWorkflowMatterClient,
  recordRecordsRequestSentFromFulfillment,
  recordRecordsResponse,
  type RecordsRequestFulfillmentEvent,
  type RecordsRequestMailingClass,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";
import {
  AGENCY_RECORDS_REQUEST_WORKFLOW_ID,
  RECORDS_REQUEST_VERTICAL_ID,
  type AgencyRecordsContextKind,
} from "./workflow.js";

const client = createHttpWorkflowMatterClient({
  basePath: "/api/workflow-runtime",
});

export type MailingAddress = WorkflowMailingAddress;
export type PacketPreview = WorkflowPacketPreview;
export type WorkflowAnalysis = WorkflowMatterAnalysis;

export type RecordsRequestContextDocument = {
  id: string;
  document_id: string;
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

function toContextDocument(document: WorkflowMatterDocument): RecordsRequestContextDocument {
  return {
    id: document.id,
    document_id: document.documentId,
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

function toContextDocuments(documents: WorkflowMatterDocument[]): RecordsRequestContextDocument[] {
  return documents.map(toContextDocument);
}

export async function createAgencyRecordsRequestMatter() {
  const matter = await client.createMatter({
    workflowId: AGENCY_RECORDS_REQUEST_WORKFLOW_ID,
    verticalId: RECORDS_REQUEST_VERTICAL_ID,
  });
  return {
    id: matter.id,
    workflow_id: matter.workflowId,
    vertical_id: matter.verticalId,
    status: matter.status,
    created_at: matter.createdAt,
    updated_at: matter.updatedAt,
  };
}

export async function loadAgencyRecordsRequestMatter(matterId: string) {
  const snapshot = await client.loadMatter(matterId);
  return {
    matter: snapshot.matter,
    documents: toContextDocuments(snapshot.documents),
  };
}

export async function uploadRecordsRequestContext(input: {
  file: File;
  kind: AgencyRecordsContextKind;
}) {
  return client.uploadDocument({
    file: input.file,
    workflowId: AGENCY_RECORDS_REQUEST_WORKFLOW_ID,
    purpose: `records-request-context:${input.kind}`,
  });
}

export async function attachRecordsRequestContext(input: {
  matterId: string;
  documentId: string;
  kind: AgencyRecordsContextKind;
  position?: number;
}) {
  const documents = await client.attachDocument({
    matterId: input.matterId,
    documentId: input.documentId,
    role: "evidence",
    evidenceKind: input.kind,
    position: input.position,
  });
  return toContextDocuments(documents);
}

export async function updateRecordsRequestContext(input: {
  matterId: string;
  documentId: string;
  included?: boolean;
  position?: number;
}) {
  return toContextDocuments(await client.updateDocument(input));
}

export async function detachRecordsRequestContext(matterId: string, documentId: string) {
  return toContextDocuments(await client.detachDocument(matterId, documentId));
}

export function saveRecordsRequestInput(matterId: string, input: Record<string, unknown>) {
  return client.saveInput(matterId, input);
}

export function loadRecordsRequestInput(matterId: string) {
  return client.loadInput(matterId);
}

/**
 * Request-first drafting intentionally calls generate directly. The shared
 * runtime creates versioned structured analysis from validated user input when
 * no source document exists; it does not fabricate a subject_notice.
 */
export function generateRecordsRequestDraft(matterId: string) {
  return client.generateDraft(matterId);
}

export function loadRecordsRequestAnalysis(matterId: string) {
  return client.loadAnalysis(matterId);
}

export function saveRecordsRequestDraft(matterId: string, bodyText: string) {
  return client.saveDraft(matterId, bodyText);
}

export function loadRecordsRequestDraft(matterId: string) {
  return client.loadDraft(matterId);
}

export function previewRecordsRequestPacket(
  matterId: string,
  mailClass: RecordsRequestMailingClass,
) {
  return client.previewPacket(matterId, mailClass);
}

export function approveRecordsRequestPacket(input: {
  matterId: string;
  preview: PacketPreview;
  recipient: MailingAddress;
  mailClass: RecordsRequestMailingClass;
}) {
  return client.approvePacket({
    matterId: input.matterId,
    preview: input.preview,
    recipient: input.recipient,
    mailClass: input.mailClass,
  });
}

export function loadRecordsRequestApproval(matterId: string) {
  return client.loadApproval(matterId);
}

export function checkoutRecordsRequest(input: {
  matterId: string;
  approvalId: string;
  sender: MailingAddress;
}) {
  return client.checkout({
    matterId: input.matterId,
    approvalId: input.approvalId,
    sender: input.sender,
  });
}

/**
 * Pure domain bridge for a trusted server/provider event. Do not call this
 * from checkout completion or a client-supplied timestamp.
 */
export function recordsRequestSentFromProvider(input: {
  event: RecordsRequestFulfillmentEvent;
  mailingClass: RecordsRequestMailingClass;
}) {
  return recordRecordsRequestSentFromFulfillment(input);
}

export function recordAgencyResponse(input: {
  responded: boolean;
  responseDate?: string;
  responseArtifactIds?: readonly string[];
  note?: string;
  observationDate?: string;
}) {
  return recordRecordsResponse(input);
}
