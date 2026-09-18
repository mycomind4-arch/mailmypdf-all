import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlatformWorkflowRuntimeRequestHandler, WorkflowRuntimeError, noticeResponseEvidenceReviewFingerprint } from "@mailmypdf/workflows";
import { saveCaseDraft, loadLatestCaseDraft } from "../src/lib/secure-core/case-draft.server";
import { createWorkflowRuntimeHostDependencies } from "../src/lib/secure-core/workflow-runtime-host.server";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";

// Minimal in-memory stand-in for the Supabase query builder, sufficient for
// the single-table chains case-draft.server.ts issues (select/eq/order/limit
// /maybeSingle, and insert). Mirrors the stubbing pattern already used in
// workflow-runtime.test.ts.
function draftTestContext() {
  const rows: Array<{ case_id: string; owner_id: string; version: number; body_text: string; basis: unknown; created_at: string }> = [];

  const context = {
    user: { id: "owner-1" },
    supabase: {
      from(table: string) {
        if (table !== "case_drafts" && table !== "workflow_cases") {
          throw new Error(`unexpected table ${table}`);
        }
        if (table === "workflow_cases") {
          const query = {
            select() { return query; }, eq() { return query; },
            update() { return query; },
            maybeSingle() {
              return Promise.resolve({
                data: { id: "case-1", workflow_id: "cp14-response", vertical_id: "notice-respond", status: "intake", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
                error: null,
              });
            },
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ error: null }).then(resolve);
            },
          };
          return query;
        }

        let insertedFilter: ((row: (typeof rows)[number]) => boolean) | null = null;
        const query = {
          select() { return query; },
          eq(column: "case_id" | "owner_id", value: string) {
            const previous = insertedFilter;
            insertedFilter = (row) => (previous ? previous(row) : true) && row[column] === value;
            return query;
          },
          order() { return query; },
          limit() { return query; },
          maybeSingle() {
            const matches = rows.filter((row) => (insertedFilter ? insertedFilter(row) : true));
            matches.sort((a, b) => b.version - a.version);
            return Promise.resolve({ data: matches[0] ?? null, error: null });
          },
          insert(row: { case_id: string; owner_id: string; version: number; body_text: string; basis?: unknown }) {
            rows.push({ ...row, basis: row.basis ?? null, created_at: new Date().toISOString() });
            return Promise.resolve({ error: null });
          },
        };
        return query;
      },
    },
  } as unknown as AuthenticatedUserContext;

  return context;
}

test("draft basis round-trips through persistence", async () => {
  const context = draftTestContext();
  const basis = {
    analysisVersion: 1,
    analysisDocumentId: "notice-1",
    inputVersion: 1,
    documentsFingerprint: "fingerprint-1",
  };

  const saved = await saveCaseDraft("case-1", { bodyText: "Response body", basis }, context);
  assert.equal(saved.version, 1);

  const loaded = await loadLatestCaseDraft("case-1", context);
  assert.ok(loaded);
  assert.equal(loaded?.bodyText, "Response body");
  assert.deepEqual(loaded?.basis, basis);
});

test("a draft saved without a basis loads with a null basis, not a fabricated one", async () => {
  const context = draftTestContext();
  await saveCaseDraft("case-1", { bodyText: "No basis yet" }, context);
  const loaded = await loadLatestCaseDraft("case-1", context);
  assert.equal(loaded?.basis, null);
});

test("workflow-runtime-host: saveApproval and checkout fail closed with NOT_IMPLEMENTED", async () => {
  const deps = createWorkflowRuntimeHostDependencies();

  await assert.rejects(
    () => deps.store.saveApproval("owner-1", "matter-1", {
      approvalId: "a1", matterId: "matter-1", workflowId: "cp14-response",
      packetSha256: "0".repeat(64), totalCents: 100,
      recipient: { name: "IRS", line1: "100 Way", city: "Fresno", state: "CA", postal: "93725" },
      mailClass: "certified", approvedBy: "owner-1", approvedAt: new Date().toISOString(),
    }),
    (error: unknown) => error instanceof WorkflowRuntimeError && error.code === "NOT_IMPLEMENTED",
  );

  await assert.rejects(
    () => deps.checkout.checkout({
      actor: { id: "owner-1", scopes: [] },
      matter: { matter: { id: "matter-1", workflowId: "cp14-response", verticalId: "notice-respond", status: "approved", createdAt: "", updatedAt: "" }, documents: [] },
      approval: {
        approvalId: "a1", matterId: "matter-1", workflowId: "cp14-response",
        packetSha256: "0".repeat(64), totalCents: 100,
        recipient: { name: "IRS", line1: "100 Way", city: "Fresno", state: "CA", postal: "93725" },
        mailClass: "certified", approvedBy: "owner-1", approvedAt: new Date().toISOString(),
      },
      sender: { name: "Sender", line1: "1 Way", city: "Fresno", state: "CA", postal: "93725" },
    }),
    (error: unknown) => error instanceof WorkflowRuntimeError && error.code === "NOT_IMPLEMENTED",
  );

  // loadApproval fails safe (null, "nothing approved yet") rather than throwing,
  // since it is a read with no invented-data risk.
  assert.equal(await deps.store.loadApproval("owner-1", "matter-1"), null);
});

test("workflow-runtime host route: cp14-response dispatch runs through packet preview via the real platform policy", async () => {
  // Exercises createPlatformWorkflowRuntimeRequestHandler's routing and the
  // real cp14-response platform policy (from @mailmypdf/workflows) end to
  // end through packet preview, using an in-memory fake store/gateways —
  // not the real secure-core-backed adapter, which requires live
  // Supabase/AI credentials this test suite does not have. Proves the route
  // wiring and policy identity (notice-respond) are correct; does not prove
  // the Supabase-backed queries in workflow-runtime-host.server.ts, which
  // can only be verified against a real database.
  type Doc = { id: string; documentId: string; role: "subject_notice" | "evidence"; evidenceKind: string | null; pageCount: number | null; included: boolean; position: number; filename: string; mimeType: string | null; sizeBytes: number | null; securityStatus: string; usable: boolean };

  let matterCounter = 0;
  const matters = new Map<string, { matter: { id: string; workflowId: string; verticalId: string; status: string; createdAt: string; updatedAt: string }; documents: Doc[] }>();
  const analyses = new Map<string, unknown>();
  const inputs = new Map<string, { version: number; input: Record<string, unknown>; createdAt: string }>();
  const drafts = new Map<string, { version: number; bodyText: string; createdAt: string; basis?: unknown }>();

  const handler = createPlatformWorkflowRuntimeRequestHandler({
    async authenticate(request) {
      return request.headers.get("authorization") === "Bearer test-token" ? { id: "owner-1", scopes: [] } : null;
    },
    store: {
      async createMatter(input) {
        matterCounter += 1;
        const id = `matter-${matterCounter}`;
        const record = { id, workflowId: input.workflowId, verticalId: input.verticalId, status: "intake", createdAt: input.createdAt, updatedAt: input.createdAt };
        matters.set(id, { matter: record, documents: [] });
        return record;
      },
      async loadMatter(_ownerId, matterId) { return matters.get(matterId) ?? null; },
      async replaceDocuments(_ownerId, matterId, documents) {
        const entry = matters.get(matterId)!;
        entry.documents = documents as Doc[];
        return entry.documents;
      },
      async saveAnalysis(_ownerId, matterId, analysis) { analyses.set(matterId, analysis); },
      async loadAnalysis(_ownerId, matterId) { return (analyses.get(matterId) as never) ?? null; },
      async saveInput(_ownerId, matterId, input) {
        const stored = { version: 1, input, createdAt: new Date().toISOString() };
        inputs.set(matterId, stored);
        return stored;
      },
      async loadInput(_ownerId, matterId) { return inputs.get(matterId) ?? null; },
      async saveDraft(_ownerId, matterId, input) {
        const stored = { version: 1, bodyText: input.bodyText, createdAt: new Date().toISOString(), basis: input.basis };
        drafts.set(matterId, stored);
        return stored;
      },
      async loadDraft(_ownerId, matterId) { return drafts.get(matterId) ?? null; },
      async saveApproval() { throw new Error("not exercised in this test"); },
      async loadApproval() { return null; },
    },
    documents: {
      async upload() { return { id: "doc-1", filename: "cp14-notice.pdf", sizeBytes: 1024, securityStatus: "clean" }; },
      async describe() { return { filename: "cp14-notice.pdf", mimeType: "application/pdf", sizeBytes: 1024, pageCount: 1, securityStatus: "clean", usable: true }; },
    },
    intelligence: {
      async analyze() {
        return {
          documentId: "doc-1",
          model: "test-model",
          result: {
            decision: null, issuer: "IRS", referenceNumber: "CP14-1", decisionDate: null, deadline: null,
            confidence: "high" as const, summary: "Balance due notice.", reasons: [], missingInformation: [],
            suggestedEvidence: [], promptInjectionObserved: false,
          },
        };
      },
      async generateDraft() { return { bodyText: "Dear IRS, this is my CP14 response.", model: "test-model" }; },
    },
    packet: {
      async preview() {
        return {
          packetSha256: "1".repeat(64),
          responsePages: 1,
          supportingPages: 0,
          manifest: [],
          quote: { totalCents: 1494 },
        };
      },
    },
    checkout: {
      async checkout() { throw new Error("not exercised in this test"); },
    },
  }, { basePath: "/api/workflow-runtime" });

  const authHeaders = { authorization: "Bearer test-token", "content-type": "application/json" };

  const createRes = await handler(new Request("https://app.test/api/workflow-runtime/matters", {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ workflowId: "cp14-response", verticalId: "notice-respond" }),
  }));
  assert.equal(createRes.status, 201);
  const { matter } = await createRes.json() as { matter: { id: string } };

  const analyzeRes = await handler(new Request(`https://app.test/api/workflow-runtime/matters/${matter.id}/documents`, {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ documentId: "doc-1", role: "subject_notice" }),
  }));
  assert.equal(analyzeRes.status, 200);

  const analysisRes = await handler(new Request(`https://app.test/api/workflow-runtime/matters/${matter.id}/analysis`, {
    method: "POST", headers: authHeaders,
  }));
  assert.equal(analysisRes.status, 200);

  // The real platform notice-response policy's validateInput requires
  // taxpayerName/taxpayerAddress/requestedAction and a responseMode from its
  // own allowed set (agree/disagree/already_paid/other) — this is a
  // different field set than secure-core's own cp14 input zod schema in
  // case-inputs.server.ts (which instead requires e.g. taxYear and has no
  // requestedAction field at all). That mismatch is a real, discovered gap
  // between the shared platform's own input contract and secure-core's,
  // independent of this host adapter's plumbing; see the implementation
  // report. This test satisfies the *platform's* validateInput because it
  // runs through the real policy; it does not exercise the real
  // secure-core-backed store.saveInput; the fail-closed test above via a
  // fake store is the only accepted "runs through" evidence for the two
  // combined.
  const inputRes = await handler(new Request(`https://app.test/api/workflow-runtime/matters/${matter.id}/input`, {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({
      responseMode: "agree",
      taxpayerName: "Jane Taxpayer",
      taxpayerAddress: "1 Main St, Fresno, CA 93725",
      requestedAction: "Please update the account balance as agreed.",
      evidenceReviewComplete: true,
      evidenceReviewFingerprint: noticeResponseEvidenceReviewFingerprint(matters.get(matter.id)!.documents),
    }),
  }));
  assert.equal(inputRes.status, 200, await inputRes.clone().text());

  const draftRes = await handler(new Request(`https://app.test/api/workflow-runtime/matters/${matter.id}/draft`, {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ bodyText: "Dear IRS, this is my CP14 response." }),
  }));
  assert.equal(draftRes.status, 200, await draftRes.clone().text());

  const packetRes = await handler(new Request(`https://app.test/api/workflow-runtime/matters/${matter.id}/packet`, {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ mailClass: "certified" }),
  }));
  assert.equal(packetRes.status, 200, await packetRes.clone().text());
  const { packet } = await packetRes.json() as { packet: { quote: { totalCents: number } } };
  assert.equal(packet.quote.totalCents, 1494);
});

test("workflow-runtime host route: rejects a matter whose vertical does not match cp14-response's platform policy", async () => {
  const handler = createPlatformWorkflowRuntimeRequestHandler({
    async authenticate() { return { id: "owner-1", scopes: [] }; },
    store: {
      async createMatter() { throw new Error("should not be reached"); },
      async loadMatter() { return null; },
      async replaceDocuments() { return []; },
      async saveAnalysis() {}, async loadAnalysis() { return null; },
      async saveInput() { throw new Error("unused"); }, async loadInput() { return null; },
      async saveDraft() { throw new Error("unused"); }, async loadDraft() { return null; },
      async saveApproval() { throw new Error("unused"); }, async loadApproval() { return null; },
    },
    documents: { async upload() { throw new Error("unused"); }, async describe() { throw new Error("unused"); } },
    intelligence: { async analyze() { throw new Error("unused"); }, async generateDraft() { throw new Error("unused"); } },
    packet: { async preview() { throw new Error("unused"); } },
    checkout: { async checkout() { throw new Error("unused"); } },
  }, { basePath: "/api/workflow-runtime" });

  const response = await handler(new Request("https://app.test/api/workflow-runtime/matters", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ workflowId: "cp14-response", verticalId: "notice-response" }),
  }));
  assert.equal(response.status, 409);
});
