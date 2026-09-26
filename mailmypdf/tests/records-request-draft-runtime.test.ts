import { after, before, describe, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";
import { generateDraftResponse } from "../src/lib/secure-core/case-analysis.server";
import { CaseError } from "../src/lib/secure-core/case.server";

/*
 * Regression coverage for the request-first drafting defect: the platform
 * host's generic intelligence.generateDraft ultimately calls
 * generateDraftResponse(), which used to unconditionally require a real
 * subject_notice document matching the analysis document id via
 * assertDraftReady(). That can never hold for a source-optional workflow
 * (Records Request) whose analysis is a synthetic `workflow-input:<version>`
 * id with zero source documents.
 *
 * These tests exercise the real production functions — resolveCaseWorkflow,
 * assertDraftReady, generateDraftResponse, askModel — through the same
 * Supabase REST + model-provider network boundary
 * mailmypdf/tests/ai-gateway-disclosure.test.ts uses, rather than mocking
 * WorkflowRuntimeIntelligenceGateway or any runtime-policy/analysis logic.
 */

const OWNER = "11111111-1111-4111-8111-111111111111";
const REQUEST_FIRST_CASE = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_FIRST_CASE = "33333333-3333-4333-8333-333333333333";
const vaultUrl = "https://synthetic-vault.example.invalid";
const modelUrl = "https://api.anthropic.com/v1/messages";

const environmentKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
before(() => {
  process.env.SUPABASE_URL = vaultUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role-key";
  process.env.ANTHROPIC_API_KEY = "synthetic-provider-key";
});
after(() => {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function harness(
  t: TestContext,
  options: {
    caseId: string;
    workflowId: string;
    verticalId: string;
    analysisDocumentId: string;
    analysisResult: Record<string, unknown>;
    documents?: Array<{ document_id: string; role: string; included: boolean; usable: boolean }>;
  },
) {
  const documentRows = (options.documents ?? []).map((doc, index) => ({
    id: `attachment-${index}`,
    document_id: doc.document_id,
    role: doc.role,
    evidence_kind: doc.role === "evidence" ? "supporting_document" : null,
    page_count: 1,
    included: doc.included,
    position: index,
  }));
  const secureDocumentRows = new Map(
    (options.documents ?? []).map((doc) => [
      doc.document_id,
      {
        id: doc.document_id,
        safe_filename: "synthetic.pdf",
        mime_type: "application/pdf",
        size_bytes: 10,
        security_status: doc.usable ? "clean" : "rejected",
        deleted_at: null,
        deletion_requested_at: null,
      },
    ]),
  );

  const state = {
    modelResponse: () =>
      Response.json({
        content: [{ type: "text", text: "Synthetic draft body" }],
        stop_reason: "end_turn",
        model: "claude-sonnet-5",
      }),
    providerBodies: [] as Record<string, unknown>[],
  };

  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href === modelUrl) {
      state.providerBodies.push(JSON.parse(String(init?.body)));
      return state.modelResponse();
    }
    assert.equal(url.origin, vaultUrl, "unexpected network destination");
    if (url.pathname === "/rest/v1/workflow_cases") {
      assert.equal(url.searchParams.get("owner_id"), `eq.${OWNER}`);
      assert.equal(url.searchParams.get("id"), `eq.${options.caseId}`);
      return Response.json({
        id: options.caseId,
        workflow_id: options.workflowId,
        vertical_id: options.verticalId,
        status: "open",
        created_at: "2026-09-25T00:00:00.000Z",
        updated_at: "2026-09-25T00:00:00.000Z",
      });
    }
    if (url.pathname === "/rest/v1/case_analyses") {
      assert.equal(url.searchParams.get("owner_id"), `eq.${OWNER}`);
      assert.equal(url.searchParams.get("case_id"), `eq.${options.caseId}`);
      return Response.json({
        version: 1,
        document_id: options.analysisDocumentId,
        model: "claude-sonnet-5",
        result: options.analysisResult,
        created_at: "2026-09-25T00:00:00.000Z",
      });
    }
    if (url.pathname === "/rest/v1/case_documents") {
      assert.equal(url.searchParams.get("owner_id"), `eq.${OWNER}`);
      assert.equal(url.searchParams.get("case_id"), `eq.${options.caseId}`);
      return Response.json(documentRows);
    }
    if (url.pathname === "/rest/v1/secure_documents") {
      const ids = (url.searchParams.get("id") ?? "").replace(/^in\.\(|\)$/g, "").split(",");
      return Response.json(ids.map((id) => secureDocumentRows.get(id)).filter(Boolean));
    }
    assert.fail(`unexpected synthetic request: ${url.pathname}`);
  });

  const context = {
    user: { id: OWNER },
    supabase: createClient(vaultUrl, "synthetic-user-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, init) },
    }),
  } as AuthenticatedUserContext;

  return { state, context };
}

describe("request-first drafting (Records Request)", () => {
  const workflowId = "public-records-request";
  const verticalId = "records-request";
  const analysisDocumentId = "workflow-input:1";

  test("matter -> deterministic request-first analysis -> draft succeeds with zero source documents", async (t) => {
    const { state, context } = harness(t, {
      caseId: REQUEST_FIRST_CASE,
      workflowId,
      verticalId,
      analysisDocumentId,
      analysisResult: {
        decision: null,
        issuer: "Synthetic Agency",
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: "Records request to Synthetic Agency for the user-confirmed records scope.",
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
        workflowDetails: {
          agency: "Synthetic Agency",
          custodian: null,
          caseReference: null,
          propertyReference: null,
          dateRange: null,
          recordCategories: [],
          contactDetails: [],
        },
      },
      documents: [],
    });

    const draft = await generateDraftResponse(REQUEST_FIRST_CASE, context, {
      validatedInput: {
        version: 1,
        input: { agency: "Synthetic Agency", recordsSought: "Synthetic records" },
      },
    });

    assert.equal(draft.bodyText, "Synthetic draft body");
    assert.equal(state.providerBodies.length, 1);
  });
});

describe("document-first workflows still fail closed", () => {
  const workflowId = "cp14-response";
  const verticalId = "notice-response";

  test("missing source document blocks drafting", async (t) => {
    const { context } = harness(t, {
      caseId: DOCUMENT_FIRST_CASE,
      workflowId,
      verticalId,
      analysisDocumentId: "real-document-1",
      analysisResult: {
        decision: null,
        issuer: null,
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: "Synthetic CP14 analysis",
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
        workflowDetails: {
          taxYear: null,
          amountDue: null,
          proposedTax: null,
          proposedPenalty: null,
          proposedInterest: null,
          proposedIncomeChanges: [],
          payerReferences: [],
          reportedIncome: null,
          irsReportedIncome: null,
          incomeSource: null,
          paymentInstructions: null,
          responseAddress: null,
        },
      },
      documents: [],
    });

    await assert.rejects(
      generateDraftResponse(DOCUMENT_FIRST_CASE, context, {
        validatedInput: { version: 1, input: { responseMode: "disagree" } },
      }),
      (error: unknown) =>
        error instanceof CaseError && error.message.includes("Analyze the current notice"),
    );
  });

  test("unsafe source document blocks drafting even once analysis exists", async (t) => {
    const { context } = harness(t, {
      caseId: DOCUMENT_FIRST_CASE,
      workflowId,
      verticalId,
      analysisDocumentId: "real-document-1",
      analysisResult: {
        decision: null,
        issuer: null,
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: "Synthetic CP14 analysis",
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
        workflowDetails: {
          taxYear: null,
          amountDue: null,
          proposedTax: null,
          proposedPenalty: null,
          proposedInterest: null,
          proposedIncomeChanges: [],
          payerReferences: [],
          reportedIncome: null,
          irsReportedIncome: null,
          incomeSource: null,
          paymentInstructions: null,
          responseAddress: null,
        },
      },
      documents: [
        { document_id: "real-document-1", role: "subject_notice", included: true, usable: false },
      ],
    });

    await assert.rejects(
      generateDraftResponse(DOCUMENT_FIRST_CASE, context, {
        validatedInput: { version: 1, input: { responseMode: "disagree" } },
      }),
      (error: unknown) => error instanceof CaseError && error.message.includes("security checks"),
    );
  });
});
