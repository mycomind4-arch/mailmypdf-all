export type WorkflowDocumentRole = "subject_notice" | "evidence";

export type WorkflowMatterDocument = {
  id: string;
  documentId: string;
  role: WorkflowDocumentRole;
  evidenceKind: string | null;
  pageCount: number | null;
  included: boolean;
  position: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  securityStatus: string;
  usable: boolean;
};

export type WorkflowMatterRecord = {
  id: string;
  workflowId: string;
  verticalId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowMatterSnapshot = {
  matter: WorkflowMatterRecord;
  documents: WorkflowMatterDocument[];
};

export type WorkflowMatterAnalysis = {
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

export type WorkflowPacketPreview = {
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: Array<{
    documentId: string;
    role: string;
    evidenceKind: string | null;
    filename: string;
    sha256: string;
    pageCount: number;
  }>;
  quote: {
    totalCents: number;
    [key: string]: unknown;
  };
};

export type WorkflowMatterEvent = {
  id: string;
  type: string;
  occurredOn: string;
  data: Readonly<Record<string, unknown>>;
  createdAt: string;
  source: "user" | "provider" | "system";
};

export type WorkflowMailingAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
};

export interface WorkflowMatterClient {
  createMatter(input: { workflowId: string; verticalId: string }): Promise<WorkflowMatterRecord>;
  loadMatter(matterId: string): Promise<WorkflowMatterSnapshot>;

  uploadDocument(input: {
    file: File;
    workflowId: string;
    purpose: string;
  }): Promise<{ id: string; filename: string; sizeBytes: number; securityStatus: string }>;

  attachDocument(input: {
    matterId: string;
    documentId: string;
    role: WorkflowDocumentRole;
    evidenceKind?: string | null;
    position?: number;
  }): Promise<WorkflowMatterDocument[]>;

  updateDocument(input: {
    matterId: string;
    documentId: string;
    included?: boolean;
    position?: number;
  }): Promise<WorkflowMatterDocument[]>;

  detachDocument(matterId: string, documentId: string): Promise<WorkflowMatterDocument[]>;

  analyze(matterId: string): Promise<WorkflowMatterAnalysis>;
  loadAnalysis(matterId: string): Promise<WorkflowMatterAnalysis | null>;

  saveInput(matterId: string, input: Record<string, unknown>): Promise<number>;
  loadInput(matterId: string): Promise<{ version: number; input: Record<string, unknown> } | null>;

  generateDraft(matterId: string): Promise<{
    bodyText: string;
    model: string;
    basedOnAnalysisVersion: number;
  }>;
  saveDraft(matterId: string, bodyText: string): Promise<number>;
  loadDraft(matterId: string): Promise<{ version: number; bodyText: string; createdAt: string } | null>;

  previewPacket(
    matterId: string,
    mailClass: "standard" | "certified" | "registered",
  ): Promise<WorkflowPacketPreview>;

  approvePacket(input: {
    matterId: string;
    preview: WorkflowPacketPreview;
    recipient: WorkflowMailingAddress;
    mailClass: "standard" | "certified" | "registered";
  }): Promise<{ approvalId: string; packetSha256: string; quote: WorkflowPacketPreview["quote"] }>;

  loadApproval(matterId: string): Promise<{
    approvalId: string;
    packetSha256: string;
    quote: WorkflowPacketPreview["quote"];
  } | null>;

  loadEvents(matterId: string): Promise<WorkflowMatterEvent[]>;
  recordUserEvent(
    matterId: string,
    event: Record<string, unknown>,
  ): Promise<WorkflowMatterEvent>;

  checkout(input: {
    matterId: string;
    approvalId: string;
    sender: WorkflowMailingAddress;
  }): Promise<{ checkoutUrl: string; orderId: string; packetSha256: string; totalCents: number }>;
}

/**
 * Generic HTTP adapter for hosts that expose the shared matter-runtime
 * contract. The workflow itself never imports an app-specific client.
 */
export function createHttpWorkflowMatterClient(input: {
  basePath?: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
} = {}): WorkflowMatterClient {
  const base = (input.basePath ?? "/api/workflow-runtime").replace(/\/$/, "");
  const fetchImpl = input.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = await input.getAccessToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : `Workflow runtime request failed (${response.status})`);
    }
    return payload as T;
  }

  return {
    async createMatter(value) {
      const payload = await request<{ matter: WorkflowMatterRecord }>("/matters", {
        method: "POST",
        body: JSON.stringify(value),
      });
      return payload.matter;
    },
    async loadMatter(matterId) {
      return request<WorkflowMatterSnapshot>(`/matters/${encodeURIComponent(matterId)}`);
    },
    async uploadDocument(value) {
      const form = new FormData();
      form.append("file", value.file);
      form.append("workflowId", value.workflowId);
      form.append("purpose", value.purpose);
      form.append("consent", "true");
      const payload = await request<{ document: { id: string; filename: string; sizeBytes: number; securityStatus: string } }>(
        "/documents",
        { method: "POST", body: form },
      );
      return payload.document;
    },
    async attachDocument(value) {
      const payload = await request<{ documents: WorkflowMatterDocument[] }>(
        `/matters/${encodeURIComponent(value.matterId)}/documents`,
        { method: "POST", body: JSON.stringify(value) },
      );
      return payload.documents;
    },
    async updateDocument(value) {
      const payload = await request<{ documents: WorkflowMatterDocument[] }>(
        `/matters/${encodeURIComponent(value.matterId)}/documents/${encodeURIComponent(value.documentId)}`,
        { method: "PATCH", body: JSON.stringify(value) },
      );
      return payload.documents;
    },
    async detachDocument(matterId, documentId) {
      const payload = await request<{ documents: WorkflowMatterDocument[] }>(
        `/matters/${encodeURIComponent(matterId)}/documents/${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );
      return payload.documents;
    },
    async analyze(matterId) {
      const payload = await request<{ analysis: WorkflowMatterAnalysis }>(
        `/matters/${encodeURIComponent(matterId)}/analysis`,
        { method: "POST" },
      );
      return payload.analysis;
    },
    async loadAnalysis(matterId) {
      const payload = await request<{ analysis: WorkflowMatterAnalysis | null }>(
        `/matters/${encodeURIComponent(matterId)}/analysis`,
      );
      return payload.analysis;
    },
    async saveInput(matterId, value) {
      const payload = await request<{ version: number }>(
        `/matters/${encodeURIComponent(matterId)}/input`,
        { method: "POST", body: JSON.stringify(value) },
      );
      return payload.version;
    },
    async loadInput(matterId) {
      const payload = await request<{ input: { version: number; input: Record<string, unknown> } | null }>(
        `/matters/${encodeURIComponent(matterId)}/input`,
      );
      return payload.input;
    },
    async generateDraft(matterId) {
      const payload = await request<{ bodyText: string; model: string; basedOnAnalysisVersion: number }>(
        `/matters/${encodeURIComponent(matterId)}/draft/generate`,
        { method: "POST" },
      );
      return payload;
    },
    async saveDraft(matterId, bodyText) {
      const payload = await request<{ version: number }>(
        `/matters/${encodeURIComponent(matterId)}/draft`,
        { method: "POST", body: JSON.stringify({ bodyText }) },
      );
      return payload.version;
    },
    async loadDraft(matterId) {
      const payload = await request<{ draft: { version: number; bodyText: string; createdAt: string } | null }>(
        `/matters/${encodeURIComponent(matterId)}/draft`,
      );
      return payload.draft;
    },
    async previewPacket(matterId, mailClass) {
      const payload = await request<{ packet: WorkflowPacketPreview }>(
        `/matters/${encodeURIComponent(matterId)}/packet`,
        { method: "POST", body: JSON.stringify({ mailClass }) },
      );
      return payload.packet;
    },
    async approvePacket(value) {
      return request(`/matters/${encodeURIComponent(value.matterId)}/approval`, {
        method: "POST",
        body: JSON.stringify({
          expectedPacketSha256: value.preview.packetSha256,
          expectedTotalCents: value.preview.quote.totalCents,
          recipient: value.recipient,
          mailClass: value.mailClass,
        }),
      });
    },
    async loadApproval(matterId) {
      const payload = await request<{ approval: {
        approvalId: string;
        packetSha256: string;
        quote: WorkflowPacketPreview["quote"];
      } | null }>(`/matters/${encodeURIComponent(matterId)}/approval`);
      return payload.approval;
    },
    async loadEvents(matterId) {
      const payload = await request<{ events: WorkflowMatterEvent[] }>(
        `/matters/${encodeURIComponent(matterId)}/events`,
      );
      return payload.events;
    },
    async recordUserEvent(matterId, event) {
      const payload = await request<{ event: WorkflowMatterEvent }>(
        `/matters/${encodeURIComponent(matterId)}/events`,
        { method: "POST", body: JSON.stringify(event) },
      );
      return payload.event;
    },
    async checkout(value) {
      return request(`/matters/${encodeURIComponent(value.matterId)}/checkout`, {
        method: "POST",
        body: JSON.stringify({ approvalId: value.approvalId, sender: value.sender }),
      });
    },
  };
}
