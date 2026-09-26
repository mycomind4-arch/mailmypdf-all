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

class RequestFirstStore implements WorkflowRuntimeStore {
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
    const stored: WorkflowRuntimeStoredInput = {
      version: (previous?.version ?? 0) + 1,
      input,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
    this.inputs.set(matterId, stored);
    return stored;
  }

  async loadInput(ownerId: string, matterId: string) {
    return (await this.loadMatter(ownerId, matterId)) ? this.inputs.get(matterId) ?? null : null;
  }

  async saveDraft(
    ownerId: string,
    matterId: string,
    input: Parameters<WorkflowRuntimeStore["saveDraft"]>[2],
  ) {
    if (!(await this.loadMatter(ownerId, matterId))) throw new Error("Matter not found");
    const previous = this.drafts.get(matterId);
    const stored: WorkflowRuntimeStoredDraft = {
      version: (previous?.version ?? 0) + 1,
      bodyText: input.bodyText,
      basis: input.basis,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
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

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer test");
  return new Request(`https://example.test/api/workflow-runtime${path}`, { ...init, headers });
}

async function json(response: Response) {
  return response.json() as Promise<any>;
}

function requestFirstDependencies(): WorkflowRuntimeServerDependencies & { store: RequestFirstStore } {
  const store = new RequestFirstStore();
  const policy: WorkflowRuntimePolicy = {
    requiresSourceDocument: false,
    validateMatter(input) {
      if (input.workflowId !== "request-first" || input.verticalId !== "records") throw new Error("wrong workflow");
    },
    validateInput(input) {
      if (typeof input.recordsSought !== "string" || !input.recordsSought.trim()) throw new Error("recordsSought required");
      return { recordsSought: input.recordsSought.trim() };
    },
    createAnalysisFromInput({ caseInput }) {
      return {
        decision: null,
        issuer: "Example Agency",
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: `Request for ${String(caseInput.input.recordsSought)}`,
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
        workflowDetails: { source: "validated-input" },
      };
    },
  };

  return {
    store,
    now: () => "2026-09-17T00:00:00.000Z",
    id: () => "approval-1",
    authenticate: async (req) => req.headers.get("authorization") === "Bearer test" ? { id: "user-1", scopes: ["ai:execute"] } : null,
    policyFor: (workflowId) => workflowId === "request-first" ? policy : null,
    documents: {
      async upload({ file }) {
        return { id: "unused", filename: file.name, sizeBytes: file.size, securityStatus: "clean" };
      },
      async describe() {
        throw new Error("No document should be required in this test");
      },
    },
    intelligence: {
      async analyze() {
        throw new Error("Document analysis should not run for a facts-only request");
      },
      async generateDraft({ analysis, caseInput }) {
        assert.equal(analysis.model, "workflow-input");
        assert.equal(analysis.documentId, `workflow-input:${caseInput.version}`);
        assert.equal(analysis.result.workflowDetails?.source, "validated-input");
        return { bodyText: "Subject: Records request\n\nPlease provide the requested records.", model: "mock-claude" };
      },
    },
    packet: {
      async preview({ documents }) {
        assert.equal(documents.length, 0);
        return {
          packetSha256: "a".repeat(64),
          responsePages: 1,
          supportingPages: 0,
          manifest: [],
          quote: { totalCents: 999 },
        };
      },
    },
    checkout: {
      async checkout({ approval }) {
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

test("request-first workflow drafts and previews a packet without a fake source document", async () => {
  const deps = requestFirstDependencies();
  const handle = createWorkflowRuntimeRequestHandler(deps);

  let response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "request-first", verticalId: "wrong-vertical" }),
  }));
  assert.equal(response.status, 400);

  response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "request-first", verticalId: "records" }),
  }));
  assert.equal(response.status, 201);
  const matterId = (await json(response)).matter.id as string;

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recordsSought: "" }),
  }));
  assert.equal(response.status, 400);

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recordsSought: "inspection reports" }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/draft/generate`, { method: "POST" }));
  assert.equal(response.status, 200);
  const generated = await json(response);
  assert.match(generated.bodyText, /requested records/i);
  assert.equal(generated.basedOnAnalysisVersion, 1);

  const analysis = await deps.store.loadAnalysis("user-1", matterId);
  assert.equal(analysis?.model, "workflow-input");
  assert.equal(analysis?.documentId, "workflow-input:1");

  response = await handle(request(`/matters/${matterId}/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bodyText: generated.bodyText }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await json(response)).packet.supportingPages, 0);
});

test("request-first synthetic analysis is refreshed when validated input changes", async () => {
  const deps = requestFirstDependencies();
  const handle = createWorkflowRuntimeRequestHandler(deps);

  let response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "request-first", verticalId: "records" }),
  }));
  const matterId = (await json(response)).matter.id as string;

  for (const recordsSought of ["inspection reports", "inspection reports and photographs"]) {
    response = await handle(request(`/matters/${matterId}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recordsSought }),
    }));
    assert.equal(response.status, 200);

    response = await handle(request(`/matters/${matterId}/draft/generate`, { method: "POST" }));
    assert.equal(response.status, 200);
  }

  const analysis = await deps.store.loadAnalysis("user-1", matterId);
  assert.equal(analysis?.version, 2);
  assert.equal(analysis?.documentId, "workflow-input:2");
  assert.match(analysis?.result.summary ?? "", /photographs/);
});

test("document-first remains the default when a policy does not opt out", async () => {
  const deps = requestFirstDependencies();
  const defaultPolicy: WorkflowRuntimePolicy = {
    validateMatter() {},
    validateInput(input) { return input; },
    createAnalysisFromInput: deps.policyFor("request-first")?.createAnalysisFromInput,
  };
  deps.policyFor = () => defaultPolicy;
  const handle = createWorkflowRuntimeRequestHandler(deps);

  let response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "document-first", verticalId: "test" }),
  }));
  const matterId = (await json(response)).matter.id as string;

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recordsSought: "inspection reports" }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/draft/generate`, { method: "POST" }));
  assert.notEqual(response.status, 200);
  assert.match((await json(response)).error, /source/i);
});

test("request-first packet rejects a draft saved against an older input version", async () => {
  const deps = requestFirstDependencies();
  const handle = createWorkflowRuntimeRequestHandler(deps);

  let response = await handle(request("/matters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "request-first", verticalId: "records" }),
  }));
  const matterId = (await json(response)).matter.id as string;

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recordsSought: "inspection reports" }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/draft/generate`, { method: "POST" }));
  assert.equal(response.status, 200);
  const draft = (await json(response)).bodyText as string;

  response = await handle(request(`/matters/${matterId}/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bodyText: draft }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recordsSought: "inspection reports and photographs" }),
  }));
  assert.equal(response.status, 200);

  response = await handle(request(`/matters/${matterId}/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  assert.equal(response.status, 409);
  assert.equal((await json(response)).code, "DRAFT_BASIS_STALE");

  response = await handle(request(`/matters/${matterId}/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bodyText: draft }),
  }));
  assert.equal(response.status, 200);

  const analysis = await deps.store.loadAnalysis("user-1", matterId);
  assert.equal(analysis?.version, 2);
  assert.equal(analysis?.documentId, "workflow-input:2");

  response = await handle(request(`/matters/${matterId}/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  assert.equal(response.status, 200);
});
