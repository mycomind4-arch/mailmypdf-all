import { ensureSupabase, supabase } from "@/integrations/supabase/client";
import type {
  ApprovalResult,
  CaseDocument,
  MailClass,
  PacketPreview,
  Recipient,
  WorkflowCase,
} from "./ssdi-workflow-model";

export type NoticeWorkflowId = "cp14-response" | "cp2000-response";
export const NOTICE_VERTICAL_ID = "notice-response" as const;

export class NoticeWorkflowApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  await ensureSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new NoticeWorkflowApiError(401, "Sign in to continue.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new NoticeWorkflowApiError(response.status, payload.error ?? "The request could not be completed.");
  return payload;
}

export function createNoticeCase(workflowId: NoticeWorkflowId) {
  return request<{ case: WorkflowCase }>("/api/v2/cases", { method: "POST", body: JSON.stringify({ workflow_id: workflowId, vertical_id: NOTICE_VERTICAL_ID }) }).then((r) => r.case);
}
export function loadNoticeCase(caseId: string) { return request<{ case: WorkflowCase; documents: CaseDocument[] }>(`/api/v2/cases/${caseId}`); }
export async function uploadNoticeDocument(file: File, workflowId: NoticeWorkflowId, purpose = "notice") {
  const form = new FormData(); form.set("file", file); form.set("workflow_id", workflowId); form.set("purpose", purpose); form.set("consent", "true");
  const r = await request<{ document: { id: string; security_status: string } }>("/api/v2/documents", { method: "POST", body: form }); return r.document;
}
export function attachNoticeDocument(caseId: string, documentId: string, role: "subject_notice" | "evidence", evidenceKind?: string) {
  return request<{ documents: CaseDocument[] }>(`/api/v2/cases/${caseId}/documents`, { method: "POST", body: JSON.stringify({ document_id: documentId, role, evidence_kind: evidenceKind }) }).then((r) => r.documents);
}
export function saveNoticeInput(caseId: string, input: unknown) { return request<{ version: number }>(`/api/v2/cases/${caseId}/input`, { method: "POST", body: JSON.stringify(input) }); }
export function loadNoticeInput(caseId: string) { return request<{ input: { version: number; input: Record<string, unknown> } | null }>(`/api/v2/cases/${caseId}/input`); }
export function analyzeNotice(caseId: string) { return request<{ analysis: { version: number; result: Record<string, unknown> } }>(`/api/v2/cases/${caseId}/analyze`, { method: "POST" }); }
export function loadNoticeAnalysis(caseId: string) { return request<{ analysis: { version: number; result: Record<string, unknown> } | null }>(`/api/v2/cases/${caseId}/analyze`); }
export function generateNoticeDraft(caseId: string) { return request<{ draft: { bodyText: string; model: string } }>(`/api/v2/cases/${caseId}/draft-generate`, { method: "POST" }); }
export function saveNoticeDraft(caseId: string, bodyText: string) { return request<{ version: number }>(`/api/v2/cases/${caseId}/draft`, { method: "POST", body: JSON.stringify({ body_text: bodyText }) }); }
export function previewNoticePacket(caseId: string, mailClass: MailClass) { return request<{ packet: PacketPreview }>(`/api/v2/cases/${caseId}/packet`, { method: "POST", body: JSON.stringify({ mail_class: mailClass }) }).then((r) => r.packet); }
export function approveNoticePacket(caseId: string, recipient: Recipient, mailClass: MailClass, packet: PacketPreview) { return request<ApprovalResult>(`/api/v2/cases/${caseId}/approve`, { method: "POST", body: JSON.stringify({ recipient, mail_class: mailClass, expected_packet_sha256: packet.packetSha256, expected_total_cents: packet.quote.totalCents }) }); }
