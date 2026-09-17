import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkflowRuntimeRequestHandler,
  type ExactPacketApproval,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowMatterRecord,
  type WorkflowMatterSnapshot,
  type WorkflowRuntimePolicy,
  type WorkflowRuntimeServerDependencies,
  type WorkflowRuntimeStore,
  type WorkflowRuntimeStoredDraft,
  type WorkflowRuntimeStoredInput,
} from "../src/index.js";

class MemoryStore implements WorkflowRuntimeStore {
  readonly matters = new Map<string, { ownerId: string; snapshot: WorkflowMatterSnapshot }>();
  readonly analyses = new Map<string, WorkflowMatterAnalysis>();
  readonly inputs = new Map<string, WorkflowRuntimeStoredInput>();
  readonly drafts = new Map<string, WorkflowRuntimeStoredDraft>();
  readonly approvals = new Map<string, ExactPacketApproval>();

  async createMatter(input: { ownerId: string; workflowId: string; verticalId: string; createdAt: string }): Promise<WorkflowMatterRecord> {
    const matter: WorkflowMatterRecord = {
      id: `matter-${this.matters.size + 1}`,
      workflowId: input.workflowId,
      verticalId: input.verticalId,
      status: "active",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.matters.set(matter.id, { ownerId: input.ownerId, snapshot: { matter, documents: [] } });
    return matter;
  }

  async loadMatter(ownerId: string, matterId: string) {
    const row = this.matters.get(matterId);
    return row?.ownerId === ownerId ? row.snapshot : null;
  }

  async replaceDocuments(ownerId: string, matterId: string, documents: readonly WorkflowMatterDocument[]) {
    const row = this.matters.get(matterId);
    if (!row || row.ownerId !== ownerId) throw new Error("Matter not found");
    row.snapshot = { ...row.snapshot, documents: [...documents] };
    return row.snapshot.documents;
  }

  async saveAnalysis(ownerId: string, matterId: string, analysis: WorkflowMatterAnalysis) {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    this.analyses.set(matterId, analysis);
  }
  async loadAnalysis(ownerId: string, matterId: string) {
    return (await this.loadMatter(ownerId, matterId)) ? this.analyses.get(matterId) ?? null : null;
  }

  async saveInput(ownerId: string, matterId: string, input: Record<string, unknown>) {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    const previous = this.inputs.get(matterId);
    const stored = { version: (previous?.version ?? 0) + 1, input, createdAt: "2026-09-17T00:00:00.000Z" };
    this.inputs.set(matterId, stored);
    return stored;
  }
  async loadInput(ownerId: string, matterId: string) {
    return (await this.loadMatter(ownerId, matterId)) ? this.inputs.get(matterId) ?? null : null;
  }

  async saveDraft(ownerId: string, matterId: string, bodyText: string) {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    const previous = this.drafts.get(matterId);
    const stored = { version: (previous?.version ?? 0) + 1, bodyText, createdAt: "2026-09-17T00:00:00.000Z" };
    this.drafts.set(matterId, stored);
    return stored;
  }
  async loadDraft(ownerId: string, matterId: string) {
    return (await this.loadMatter(ownerId, matterId)) ? this.drafts.get(matterId) ?? null : null;
  }

  async saveApproval(ownerId: string, matterId: string, approval: ExactPacketApproval) {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    this.approvals.set(matterId, approval);
  }
  async loadApproval(ownerId: string, matterId: string) {
    return (await this.loadMatter(ownerId, matterId)) ? this.approvals.get(matterId) ?? null : null;
  }
}

const policy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "test-workflow" || input.verticalId !== "test-vertical") throw new Error("wrong workflow");
  },
  validateAnalysis(analysis) {
    if (analysis.result.workflowDetails?.appealStage !== "reconsideration") throw new Error("wrong appeal stage");
  },
  validateInput(input) {
    if (typeof input.reason !== "string" || !input.reason.trim()) throw new Error("reason required");
    return { reason: input.reason.trim() };
  },
  validateDocumentsBeforePacket(documents) {
    if (!documents.some((document) => document.evidenceKind === "required-form" && document.included && document.usable)) {
      throw new Error("required form missing");
    }
  },
};

function dependencies(): WorkflowRuntimeServerDependencies & { store: MemoryStore; checkoutCalls: { count: number } } {
  const store = new MemoryStore();
  const docs = new Map<string, { filename: string; securityStatus: string; usable: boolean }>();
  const checkoutCalls = { count: 0 };
  let idCounter = 0;

  return {
    checkoutCalls,
    store,
    now: () => "2026-09-17T00:00:00.000Z",
    id: () => `id-${++idCounter}`,
    authenticate: async (request) => request.headers.get("authorization") === "Bearer test" ? { id: "user-1", scopes: ["ai:execute"] } : null,
    policyFor: (workflowId) => workflowId === "test-workflow" ? policy : null,
    documents: {
      async upload({ file, consent }) {
        if (!consent) throw new Error("consent required");
        const id = `doc-${docs.size + 1}`;
        docs.set(id, { filename: file.name, securityStatus: "clean", usable: true });
        return { id, filename: file.name, sizeBytes: file.size, securityStatus: "clean" };
      },
      async describe({ documentId }) {
        const document = docs.get(documentId);
        if (!document) throw new Error("document not found");
        return {
          filename: document.filename,
          mimeType: "application/pdf",
          sizeBytes: 10,
          pageCount: 1,
          securityStatus: document.securityStatus,
          usable: document.usable,
        };
      },
    },
    intelligence: {
      async analyze({ source }) {
        return {
          documentId: source.documentId,
          model: "mock-claude",
          result: {
            decision: "Denied",
            issuer: "Agency",
            referenceNumber: "REF-1",
            decisionDate: "2026-09-01",
            deadline: "60 days",
            confidence: "high",
            summary: "The claim was denied.",
            reasons: ["Reason one"],
            missingInformation: [],
            suggestedEvidence: [],
            promptInjectionObserved: false,
            workflowDetails: { appealStage: "reconsideration" },
          },
        };
      },
      async generateDraft() {
        return { bodyText: "Re: Appeal\n\nDear Sir or Madam:\n\nThis is the generated test response.\n\nSincerely,\nTest User", model: "mock-claude" };
      },
    },
    packet: {
      async preview({ documents }) {
        return {
          packetSha256: "a".repeat(64),
          responsePages: 1,
          supportingPages: documents.length,
          manifest: documents.map((document) => ({
            documentId: document.documentId,
            role: document.role,
            evidenceKind: document.evidenceKind,
            filename: document.filename,
            sha256: "b".repeat(64),
            pageCount: document.pageCount ?? 1,
          })),
          quote: { totalCents: 1499 },
        };
      },
    },
    checkout: {
      async checkout({ approval }) {
        checkoutCalls.count += 1;
        return {
          checkoutUrl: "https://checkout.example/session",
          orderId: "order-1",
          packetSha256: approval.packetSha256,
          totalCents: approval.totalCents,
        };
      },
    },
  };
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer test");
  return new Request(`https://example.test/api/workflow-runtime${path}`, { ...init, headers });
}

async function body(response: Response) {
  return response.json() as Promise<any>;
}

test("shared runtime requires authentication", async () => {
  const deps = dependencies();
  const handle = createWorkflowRuntimeRequestHandler(deps);
  const response = await handle(new Request("https://example.test/api/workflow-runtime/matters"));
  assert.equal(response.status, 401);
});

test("shared runtime drives matter -> source -> analysis -> facts -> draft -> forms -> approval -> checkout", async () => {
  const deps = dependencies();
  const handle = createWorkflowRuntimeRequestHandler(deps);

  let response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "test-workflow", verticalId: "test-vertical" }),
  }));
  assert.equal(response.status, 201);
  const matterId = (await body(response)).matter.id as string;

  const sourceForm = new FormData();
  sourceForm.append("file", new File(["%PDF-test"], "decision.pdf", { type: "application/pdf" }));
  sourceForm.append("workflowId", "test-workflow");
  sourceForm.append("purpose", "source_notice");
  sourceForm.append("consent", "true");
  response = await handle(request("/documents", { method: "POST", body: sourceForm }));
  const sourceId = (await body(response)).document.id as string;

  response = await handle(request(`/matters/${matterId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId: sourceId, role: "subject_notice", position: 0 }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/analysis`, { method: "POST" }));
  assert.equal(response.status, 200);
  assert.equal((await body(response)).analysis.version, 1);

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "I disagree with the decision." }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/draft/generate`, { method: "POST" }));
  const generated = (await body(response)).bodyText as string;
  assert.match(generated, /Dear Sir or Madam/);

  response = await handle(request(`/matters/${matterId}/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bodyText: generated }),
  }));
  assert.equal(response.status, 200);

  const formData = new FormData();
  formData.append("file", new File(["%PDF-form"], "required-form.pdf", { type: "application/pdf" }));
  formData.append("workflowId", "test-workflow");
  formData.append("purpose", "required_form");
  formData.append("consent", "true");
  response = await handle(request("/documents", { method: "POST", body: formData }));
  const formId = (await body(response)).document.id as string;

  response = await handle(request(`/matters/${matterId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId: formId, role: "evidence", evidenceKind: "required-form", position: 1 }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  assert.equal(response.status, 200);
  const preview = (await body(response)).packet;
  assert.equal(preview.packetSha256, "a".repeat(64));

  response = await handle(request(`/matters/${matterId}/approval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expectedPacketSha256: preview.packetSha256,
      expectedTotalCents: preview.quote.totalCents,
      mailClass: "certified",
      recipient: { name: "Agency", line1: "1 Main St", city: "Town", state: "CA", postal: "95501" },
    }),
  }));
  assert.equal(response.status, 200);
  const approvalId = (await body(response)).approvalId as string;

  response = await handle(request(`/matters/${matterId}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approvalId,
      sender: { name: "Test User", line1: "2 Main St", city: "Town", state: "CA", postal: "95502" },
    }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await body(response)).orderId, "order-1");
  assert.equal(deps.checkoutCalls.count, 1);
});

test("shared runtime refuses approval when packet changed after preview", async () => {
  const deps = dependencies();
  let packetCalls = 0;
  deps.packet.preview = async () => ({
    packetSha256: (packetCalls++ === 0 ? "a" : "b").repeat(64),
    responsePages: 1,
    supportingPages: 1,
    manifest: [],
    quote: { totalCents: 1499 },
  });
  const handle = createWorkflowRuntimeRequestHandler(deps);

  const created = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "test-workflow", verticalId: "test-vertical" }),
  }));
  const matterId = (await body(created)).matter.id as string;

  // Seed the minimum safe state directly; the test target is immutable packet approval.
  const row = deps.store.matters.get(matterId)!;
  row.snapshot.documents = [
    {
      id: "source-link", documentId: "source", role: "subject_notice", evidenceKind: null,
      pageCount: 1, included: false, position: 0, filename: "source.pdf", mimeType: "application/pdf",
      sizeBytes: 10, securityStatus: "clean", usable: true,
    },
    {
      id: "form-link", documentId: "form", role: "evidence", evidenceKind: "required-form",
      pageCount: 1, included: true, position: 1, filename: "form.pdf", mimeType: "application/pdf",
      sizeBytes: 10, securityStatus: "clean", usable: true,
    },
  ];
  await deps.store.saveAnalysis("user-1", matterId, {
    version: 1, documentId: "source", model: "mock", createdAt: "2026-09-17T00:00:00.000Z",
    result: {
      decision: "Denied", issuer: "Agency", referenceNumber: null, decisionDate: null, deadline: null,
      confidence: "high", summary: "Denied", reasons: [], missingInformation: [], suggestedEvidence: [],
      promptInjectionObserved: false, workflowDetails: { appealStage: "reconsideration" },
    },
  });
  await deps.store.saveDraft("user-1", matterId, "Saved draft");

  const previewResponse = await handle(request(`/matters/${matterId}/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  const preview = (await body(previewResponse)).packet;

  const approvalResponse = await handle(request(`/matters/${matterId}/approval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expectedPacketSha256: preview.packetSha256,
      expectedTotalCents: preview.quote.totalCents,
      mailClass: "certified",
      recipient: { name: "Agency", line1: "1 Main St", city: "Town", state: "CA", postal: "95501" },
    }),
  }));
  assert.equal(approvalResponse.status, 409);
  assert.match((await body(approvalResponse)).error, /changed after preview/i);
});
