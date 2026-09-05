import { ensureSupabase, supabase } from "@/integrations/supabase/client";
import {
  SSDI_WORKFLOW_ID,
  SSDI_VERTICAL_ID,
  type ApprovalResult,
  type CaseDocument,
  type EvidenceKind,
  type MailClass,
  type PacketPreview,
  type Recipient,
  type WorkflowCase,
} from "./ssdi-workflow-model";

export * from "./ssdi-workflow-model";

export class WorkflowApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function accessToken(): Promise<string> {
  await ensureSupabase();
  const auth = supabase.auth;
  if (!auth) throw new WorkflowApiError(401, "Account services are not configured.");
  const { data, error } = await auth.getSession();
  if (error || !data.session?.access_token) throw new WorkflowApiError(401, "Sign in to continue.");
  return data.session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok)
    throw new WorkflowApiError(
      response.status,
      payload.error ?? "The request could not be completed.",
    );
  return payload;
}

export async function createSsdiCase(): Promise<WorkflowCase> {
  const result = await request<{ case: WorkflowCase }>("/api/v2/cases", {
    method: "POST",
    body: JSON.stringify({ workflow_id: SSDI_WORKFLOW_ID, vertical_id: SSDI_VERTICAL_ID }),
  });
  return result.case;
}

export async function loadSsdiCase(
  caseId: string,
): Promise<{ case: WorkflowCase; documents: CaseDocument[] }> {
  return request(`/api/v2/cases/${caseId}`);
}

export async function uploadSecureDocument(file: File, purpose: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("workflow_id", SSDI_WORKFLOW_ID);
  form.set("purpose", purpose);
  form.set("consent", "true");
  const result = await request<{ document: { id: string; security_status: string } }>(
    "/api/v2/documents",
    { method: "POST", body: form },
  );
  return result.document;
}

export async function attachCaseDocument(
  caseId: string,
  input: {
    document_id: string;
    role: "subject_notice" | "evidence";
    evidence_kind?: EvidenceKind;
    position?: number;
  },
): Promise<CaseDocument[]> {
  const result = await request<{ documents: CaseDocument[] }>(`/api/v2/cases/${caseId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.documents;
}

export async function patchCaseDocument(
  caseId: string,
  documentId: string,
  patch: { included?: boolean; position?: number },
): Promise<CaseDocument[]> {
  const result = await request<{ documents: CaseDocument[] }>(
    `/api/v2/cases/${caseId}/documents/${documentId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return result.documents;
}

export async function detachCaseDocument(
  caseId: string,
  documentId: string,
): Promise<CaseDocument[]> {
  const result = await request<{ documents: CaseDocument[] }>(
    `/api/v2/cases/${caseId}/documents/${documentId}`,
    { method: "DELETE" },
  );
  return result.documents;
}

export async function saveCaseDraft(caseId: string, bodyText: string): Promise<number> {
  const result = await request<{ version: number }>(`/api/v2/cases/${caseId}/draft`, {
    method: "POST",
    body: JSON.stringify({ body_text: bodyText }),
  });
  return result.version;
}

export async function previewCasePacket(
  caseId: string,
  mailClass: MailClass,
): Promise<PacketPreview> {
  const result = await request<{ packet: PacketPreview }>(`/api/v2/cases/${caseId}/packet`, {
    method: "POST",
    body: JSON.stringify({ mail_class: mailClass }),
  });
  return result.packet;
}

export async function approveCasePacket(
  caseId: string,
  recipient: Recipient,
  mailClass: MailClass,
  reviewed: PacketPreview,
): Promise<ApprovalResult> {
  return request(`/api/v2/cases/${caseId}/approve`, {
    method: "POST",
    body: JSON.stringify({
      recipient, mail_class: mailClass,
      expected_packet_sha256: reviewed.packetSha256,
      expected_total_cents: reviewed.quote.totalCents,
    }),
  });
}
