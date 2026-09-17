import { ensureSupabase, supabase } from "@/integrations/supabase/client";

export type SecureDocumentRecord = {
  id: string;
  workflow_id: string;
  safe_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  security_status: string;
  created_at: string;
};

export type WorkflowCaseRecord = {
  id: string;
  workflow_id: string;
  vertical_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

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

export type WorkflowCaseSnapshot = {
  case: WorkflowCaseRecord;
  documents: WorkflowCaseDocument[];
};

export type WorkflowAnalysis = {
  version: number;
  documentId: string;
  model: string;
  createdAt: string;
  result: {
    decision: string | null;
    issuer: string | null;
    referenceNumber: string | null;
    decisionDate: string | null;
    deadline: string | null;
    confidence: "high" | "medium" | "low";
    summary: string;
    reasons: string[];
    missingInformation: string[];
    suggestedEvidence: string[];
    promptInjectionObserved: boolean;
    workflowDetails?: Record<string, unknown>;
  };
};

export type PacketPreview = {
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: Array<{
    documentId?: string;
    document_id?: string;
    role: string;
    evidenceKind?: string | null;
    evidence_kind?: string | null;
    filename: string;
    sha256: string;
    pageCount?: number;
    page_count?: number;
  }>;
  quote: {
    totalCents: number;
    [key: string]: unknown;
  };
};

export type MailingAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
};

async function bearerToken(): Promise<string> {
  await ensureSupabase();
  if (!supabase.auth) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Please sign in again before continuing.");
  return token;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await bearerToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed (${response.status}).`);
  }
  return payload as T;
}

export async function createWorkflowCase(workflowId: string, verticalId: string): Promise<WorkflowCaseRecord> {
  const payload = await requestJson<{ case: WorkflowCaseRecord }>("/api/v2/cases", {
    method: "POST",
    body: JSON.stringify({ workflow_id: workflowId, vertical_id: verticalId }),
  });
  return payload.case;
}

export async function loadWorkflowCase(caseId: string): Promise<WorkflowCaseSnapshot> {
  return requestJson<WorkflowCaseSnapshot>(`/api/v2/cases/${caseId}`);
}

export async function uploadSecureWorkflowDocument(input: {
  file: File;
  workflowId: string;
  purpose: string;
}): Promise<SecureDocumentRecord> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("workflow_id", input.workflowId);
  form.append("purpose", input.purpose);
  form.append("consent", "true");
  const payload = await requestJson<{ document: SecureDocumentRecord }>("/api/v2/documents", {
    method: "POST",
    body: form,
  });
  return payload.document;
}

export async function attachWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  role: "subject_notice" | "evidence";
  evidenceKind?: string | null;
  position?: number;
}): Promise<WorkflowCaseDocument[]> {
  const payload = await requestJson<{ documents: WorkflowCaseDocument[] }>(
    `/api/v2/cases/${input.caseId}/documents`,
    {
      method: "POST",
      body: JSON.stringify({
        document_id: input.documentId,
        role: input.role,
        evidence_kind: input.evidenceKind ?? null,
        position: input.position ?? 0,
      }),
    },
  );
  return payload.documents;
}

export async function updateWorkflowDocument(input: {
  caseId: string;
  documentId: string;
  included?: boolean;
  position?: number;
}): Promise<WorkflowCaseDocument[]> {
  const payload = await requestJson<{ documents: WorkflowCaseDocument[] }>(
    `/api/v2/cases/${input.caseId}/documents/${input.documentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ included: input.included, position: input.position }),
    },
  );
  return payload.documents;
}

export async function detachWorkflowDocument(caseId: string, documentId: string): Promise<WorkflowCaseDocument[]> {
  const payload = await requestJson<{ documents: WorkflowCaseDocument[] }>(
    `/api/v2/cases/${caseId}/documents/${documentId}`,
    { method: "DELETE" },
  );
  return payload.documents;
}

export async function analyzeWorkflowCase(caseId: string): Promise<WorkflowAnalysis> {
  const payload = await requestJson<{ analysis: WorkflowAnalysis }>(`/api/v2/cases/${caseId}/analyze`, {
    method: "POST",
  });
  return payload.analysis;
}

export async function loadWorkflowAnalysis(caseId: string): Promise<WorkflowAnalysis | null> {
  const payload = await requestJson<{ analysis: WorkflowAnalysis | null }>(`/api/v2/cases/${caseId}/analyze`);
  return payload.analysis;
}

export async function saveWorkflowInput(caseId: string, input: Record<string, unknown>): Promise<number> {
  const payload = await requestJson<{ version: number }>(`/api/v2/cases/${caseId}/input`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.version;
}

export async function loadWorkflowInput(caseId: string): Promise<{ version: number; input: Record<string, unknown> } | null> {
  const payload = await requestJson<{ input: { version: number; input: Record<string, unknown> } | null }>(
    `/api/v2/cases/${caseId}/input`,
  );
  return payload.input;
}

export async function generateWorkflowDraft(caseId: string): Promise<{ bodyText: string; model: string; basedOnAnalysisVersion: number }> {
  const payload = await requestJson<{ body_text: string; model: string; based_on_analysis_version: number }>(
    `/api/v2/cases/${caseId}/draft-generate`,
    { method: "POST" },
  );
  return {
    bodyText: payload.body_text,
    model: payload.model,
    basedOnAnalysisVersion: payload.based_on_analysis_version,
  };
}

export async function saveWorkflowDraft(caseId: string, bodyText: string): Promise<number> {
  const payload = await requestJson<{ version: number }>(`/api/v2/cases/${caseId}/draft`, {
    method: "POST",
    body: JSON.stringify({ body_text: bodyText }),
  });
  return payload.version;
}


export async function loadWorkflowDraft(caseId: string): Promise<{ version: number; bodyText: string; createdAt: string } | null> {
  const payload = await requestJson<{ draft: { version: number; bodyText: string; createdAt: string } | null }>(
    `/api/v2/cases/${caseId}/draft`,
  );
  return payload.draft;
}

export async function loadWorkflowApproval(caseId: string): Promise<{
  approvalId: string;
  packetSha256: string;
  quote: PacketPreview["quote"];
} | null> {
  const payload = await requestJson<{
    approval: null | {
      approval_id: string;
      packet_sha256: string;
      quote: PacketPreview["quote"];
    };
  }>(`/api/v2/cases/${caseId}/approve`);
  if (!payload.approval) return null;
  return {
    approvalId: payload.approval.approval_id,
    packetSha256: payload.approval.packet_sha256,
    quote: payload.approval.quote,
  };
}

export async function previewWorkflowPacket(caseId: string, mailClass: "standard" | "certified" | "registered"): Promise<PacketPreview> {
  const payload = await requestJson<{ packet: PacketPreview }>(`/api/v2/cases/${caseId}/packet`, {
    method: "POST",
    body: JSON.stringify({ mail_class: mailClass }),
  });
  return payload.packet;
}

export async function approveWorkflowPacket(input: {
  caseId: string;
  preview: PacketPreview;
  recipient: MailingAddress;
  mailClass: "standard" | "certified" | "registered";
}): Promise<{ approvalId: string; packetSha256: string; quote: PacketPreview["quote"] }> {
  const payload = await requestJson<{
    approval_id: string;
    packet_sha256: string;
    quote: PacketPreview["quote"];
  }>(`/api/v2/cases/${input.caseId}/approve`, {
    method: "POST",
    body: JSON.stringify({
      expected_packet_sha256: input.preview.packetSha256,
      expected_total_cents: input.preview.quote.totalCents,
      recipient: input.recipient,
      mail_class: input.mailClass,
    }),
  });
  return {
    approvalId: payload.approval_id,
    packetSha256: payload.packet_sha256,
    quote: payload.quote,
  };
}

export async function checkoutWorkflowCase(input: {
  caseId: string;
  approvalId: string;
  sender: MailingAddress;
}): Promise<{ checkoutUrl: string; orderId: string; packetSha256: string; totalCents: number }> {
  const payload = await requestJson<{
    checkout_url: string;
    order_id: string;
    packet_sha256: string;
    total_cents: number;
  }>(`/api/v2/cases/${input.caseId}/checkout`, {
    method: "POST",
    body: JSON.stringify({ approval_id: input.approvalId, sender: input.sender }),
  });
  return {
    checkoutUrl: payload.checkout_url,
    orderId: payload.order_id,
    packetSha256: payload.packet_sha256,
    totalCents: payload.total_cents,
  };
}
