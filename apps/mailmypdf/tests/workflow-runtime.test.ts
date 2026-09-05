import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNoticeAnalysis, resolveCaseWorkflow, assertDraftReady } from "../src/lib/secure-core/workflow-runtime";
import { generateDraftResponse, analyseSubjectNotice } from "../src/lib/secure-core/case-analysis.server";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";

const analysis = {
  decision: "denied", issuer: null, referenceNumber: null, decisionDate: null,
  deadline: null, confidence: "low", summary: "Notice is incomplete.",
  reasons: [], missingInformation: ["Decision date"], suggestedEvidence: [],
  promptInjectionObserved: false,
};
const notice = { document_id: "notice-1", role: "subject_notice", included: true, usable: true };

test("accepts explicit uncertainty without inventing missing facts", () => {
  assert.deepEqual(validateNoticeAnalysis(analysis), analysis);
});

test("rejects malformed, incomplete and impossible-date analysis", () => {
  for (const value of [null, [], {}, { ...analysis, reasons: "denied" },
    { ...analysis, confidence: "certain" }, { ...analysis, summary: " " },
    { ...analysis, promptInjectionObserved: "false" },
    { ...analysis, deadline: "2026-02-30" }, { ...analysis, decisionDate: "tomorrow" }]) {
    assert.throws(() => validateNoticeAnalysis(value));
  }
});

test("resolves SSDI only under its persisted vertical, never falls back for unknown workflows", () => {
  assert.equal(resolveCaseWorkflow("ssdi-denial", "appeal-mail").id, "ssdi-denial");
  assert.throws(() => resolveCaseWorkflow("ssdi-denial", "dispute-mail"));
  assert.throws(() => resolveCaseWorkflow("unknown", "appeal-mail"));
  assert.throws(() => resolveCaseWorkflow("toString", "appeal-mail"));
});

test("allows drafting from the current clean notice with no enclosures", () => {
  assert.doesNotThrow(() => assertDraftReady("notice-1", analysis, [notice]));
});

test("rejects analysis of a removed, excluded, replaced or unsafe notice", () => {
  for (const documents of [[], [{ ...notice, document_id: "notice-2" }],
    [{ ...notice, included: false }], [{ ...notice, usable: false }]]) {
    assert.throws(() => assertDraftReady("notice-1", analysis, documents));
  }
});

test("blocks unsafe included evidence but ignores excluded evidence", () => {
  const evidence = { document_id: "evidence-1", role: "evidence", included: true, usable: false };
  assert.throws(() => assertDraftReady("notice-1", analysis, [notice, evidence]));
  assert.doesNotThrow(() => assertDraftReady("notice-1", analysis, [notice, { ...evidence, included: false }]));
});

test("does not draft automatically from an analysis reporting injected instructions", () => {
  assert.throws(() => assertDraftReady("notice-1", { ...analysis, promptInjectionObserved: true }, [notice]));
});

// Stub only the database boundary. The real service must stop before reaching
// the model gateway (no credentials, files or external requests are needed).
function context(rows: Record<string, unknown>): AuthenticatedUserContext {
  return {
    user: { id: "owner-1" },
    supabase: {
      from(table: string) {
        const result = { data: rows[table], error: null };
        const query = {
          select() { return query; }, eq() { return query; },
          order() { return query; }, limit() { return query; },
          in() { return query; }, maybeSingle() { return Promise.resolve(result); },
          then(resolve: (value: unknown) => unknown) { return Promise.resolve(result).then(resolve); },
        };
        return query;
      },
    },
  } as unknown as AuthenticatedUserContext;
}

test("analysis service refuses an unsupported workflow before document disclosure", async () => {
  await assert.rejects(analyseSubjectNotice("case-1", context({
    workflow_cases: { workflow_id: "unknown", vertical_id: "appeal-mail" },
  })), /enabled case runtime/);
});

test("draft service validates persisted analysis before sending it to the model", async () => {
  await assert.rejects(generateDraftResponse("case-1", context({
    workflow_cases: { workflow_id: "ssdi-denial", vertical_id: "appeal-mail" },
    case_analyses: { version: 1, document_id: "notice-1", result: { summary: "Incomplete" } },
  })), /analysis is incomplete or invalid/);
});

test("draft service refuses stored analysis after its notice is detached", async () => {
  await assert.rejects(generateDraftResponse("case-1", context({
    workflow_cases: { workflow_id: "ssdi-denial", vertical_id: "appeal-mail" },
    case_analyses: { version: 1, document_id: "notice-1", result: analysis },
    case_documents: [],
  })), /notice has changed/);
});
