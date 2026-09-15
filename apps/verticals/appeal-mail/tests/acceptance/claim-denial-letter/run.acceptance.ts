/**
 * Studio Workflow Acceptance test for appeal-mail's claim-denial-letter
 * workflow -- the second workflow registered against
 * @mailmypdf/workflow-acceptance (after car-insurance-appeal). Chosen
 * because its analyze/draft/approve/checkout route shapes exactly mirror
 * car-insurance-appeal's (checkout gated on approval status === "ready",
 * no pre-draft payment gate) -- see context/FACTORY_STATUS.md for the full
 * list of workflows sharing that shape.
 *
 * This scenario deliberately does NOT work around a known defect: 24 of
 * appeal-mail's workflows, including this one, unconditionally append a
 * literal, unresolved "[Your Name]" placeholder as the persisted draft's
 * signature (see src/domain/review.ts's missing_signature check and
 * tests/review-signature-placeholder.test.ts). Running this scenario
 * honestly is expected to surface that as a real pdfPreflight failure
 * (PDF_PLACEHOLDER_PRESENT) even though the readiness review now warns
 * about it rather than silently passing. That is the correct, desired
 * outcome for this test -- not a bug in the test itself.
 *
 * Run via `pnpm studio workflow test claim-denial-letter --json` from the
 * repo root, or `STUDIO_SCENARIO=homeowner-storm-damage-denial pnpm
 * test:acceptance` from this package for local iteration.
 */

import { it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ArtifactStore,
  loadScenario,
  createFakeSupabase,
  createStripeMock,
  createMockMailingClient,
  inspectPdfStructure,
  inspectPdfContent,
  findPlaceholders,
  buildReport,
  type CheckResult,
  type AcceptanceFailure,
  type PacketManifest,
} from "@mailmypdf/workflow-acceptance";
import { computeSha256 } from "@mailmypdf/documents";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(HERE, "scenarios");
const RUNS_DIR = join(HERE, "runs");
const WORKFLOW_ID = "claim-denial-letter";
const ACCEPTANCE_TOKEN = "studio-acceptance-token";
const TEST_USER = { id: "studio-test-user", email: "studio-acceptance@mailmypdf.test" };

const scenarioId = process.env.STUDIO_SCENARIO ?? "homeowner-storm-damage-denial";
const explicitRunId = process.env.STUDIO_RUN_ID;

process.env.STRIPE_SECRET_KEY ||= "sk_test_acceptance_dummy";
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_acceptance_dummy";
process.env.APP_URL ||= "https://appeal-mail.test";

// -- Hoisted mock state (vi.mock factories below close over this) -----------

const testState = vi.hoisted(() => {
  return {
    fakeSupabase: null as any,
    stripeMock: null as any,
    mailingClientHandle: null as any,
  };
});

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => options,
}));

vi.mock("@/platform/supabase", () => ({
  getSupabaseServer: async () => testState.fakeSupabase,
  requireAuthenticatedUser: async (request: Request) => {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new Error("Authentication required");
    const { data, error } = await testState.fakeSupabase.auth.getUser(match[1]);
    if (error || !data.user) throw new Error("Invalid or expired authentication token");
    return data.user;
  },
}));

vi.mock("stripe", () => ({
  default: class {
    constructor() {
      return new testState.stripeMock.StripeCtor();
    }
  },
}));

vi.mock("@mailmypdf/mailing-client", () => testState.mailingClientHandle.module);

vi.mock("@/platform/control-plane-ai", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    resolveAI: async (_workflowSlug: string, _task: string) => ({
      provider: "anthropic" as const,
      apiKey: "fixture",
      model: "fixture-deterministic",
      promptOverride: null,
    }),
    callAIWithDocument: async () => JSON.stringify(fixtureAnalysis()),
    callAIText: async (_cfg: unknown, _system: string, user: string, json?: boolean) => {
      // draft.ts calls callAIText twice: once for the draft (json=false),
      // once for validation (json=true). Distinguish by the `json` flag --
      // matches how the real route calls this function.
      if (json) return JSON.stringify(fixtureValidation());
      return fixtureDraftText();
    },
  };
});

// -- Fixture AI responses, templated from the scenario's synthetic facts ----
// Deterministic and internally coherent with uploads/claim-denial-letter.pdf
// -- see "Synthetic Data Requirements" in
// docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.

function facts(): Record<string, string> {
  return loadedScenario.scenario.intake.facts as Record<string, string>;
}

function fixtureAnalysis() {
  const f = facts();
  return {
    summary: `${f.insurerName} denied ${f.claimantName}'s claim ${f.claimNumber}, attributing roof damage to wear and tear and contradicting a licensed contractor's storm-damage inspection.`,
    decision: "Claim denial letter citing the wear-and-tear exclusion",
    decisionType: "claim_denial_letter",
    issuer: f.insurerName,
    referenceNumber: f.claimNumber,
    decisionDate: f.decisionDate,
    deadline: f.appealDeadline,
    reasons: [f.denialReason],
    keyFacts: [
      `Storm date: ${f.stormDate}`,
      `Independent inspection from ${f.inspectionSource}: ${f.inspectionFinding}`,
      `Repair estimate: ${f.repairEstimateAmount}`,
    ],
    issues: [
      {
        issue: `${f.insurerName}'s wear-and-tear finding contradicts the independent inspection, which found wind-driven damage consistent with the ${f.stormDate} storm.`,
        whyItMatters: f.inspectionFinding,
        evidenceNeeded: ["Licensed contractor inspection report"],
      },
    ],
    evidenceMentioned: [`Inspection report from ${f.inspectionSource}`],
    uncertainties: [],
    confidence: "high",
  };
}

function fixtureDraftText(): string {
  const f = facts();
  return [
    `Re: Appeal of Claim Denial -- Claim Number ${f.claimNumber}`,
    "",
    "Dear Claims Appeals Department,",
    "",
    `I am writing to appeal ${f.insurerName}'s decision dated ${f.decisionDate} on the above claim, ` +
      `which denied coverage for roof damage under the wear and tear exclusion, Policy Section 6.3.`,
    "",
    `This finding contradicts the independent inspection performed by ${f.inspectionSource}. ${f.inspectionFinding} ` +
      `I am enclosing that report and ask that the wear-and-tear determination be reversed.`,
    "",
    `The claim should be reprocessed and paid at the independently estimated repair cost of ${f.repairEstimateAmount} under ${f.coverageSection}.`,
    "",
    `Please reconsider this denial and reverse the wear-and-tear determination in light of the enclosed evidence before the appeal deadline of ${f.appealDeadline}.`,
    "",
    "Sincerely,",
    "",
    f.claimantName,
  ].join("\n");
}

function fixtureValidation() {
  return { valid: true, issues: [], unsupportedClaims: [], missingEvidence: [], suggestions: [] };
}

// -- The acceptance run -------------------------------------------------------

const loadedScenario = loadScenario(SCENARIOS_DIR, scenarioId);
testState.fakeSupabase = createFakeSupabase({ users: { [ACCEPTANCE_TOKEN]: TEST_USER } });
testState.stripeMock = createStripeMock();
testState.mailingClientHandle = createMockMailingClient(explicitRunId ?? "pending", WORKFLOW_ID);

it(`claim-denial-letter / ${scenarioId}`, async () => {
  const { Route: AnalyzeRoute } = await import("@/routes/api/workflows/claim-denial-letter/analyze");
  const { Route: DraftRoute } = await import("@/routes/api/workflows/claim-denial-letter/draft");
  const { Route: ApproveRoute } = await import("@/routes/api/workflows/claim-denial-letter/approve");
  const { Route: CheckoutRoute } = await import("@/routes/api/workflows/claim-denial-letter/checkout");
  const { Route: WebhookRoute } = await import("@/routes/api/stripe-webhook");

  const artifacts = ArtifactStore.create(RUNS_DIR, WORKFLOW_ID, scenarioId, explicitRunId);
  const startedAt = new Date().toISOString();
  const checks: CheckResult[] = [];
  const failures: AcceptanceFailure[] = [];
  let packetBytes: Uint8Array | null = null;
  let packetPath: string | undefined;
  artifacts.record("workflow_started", { workflowId: WORKFLOW_ID, scenarioId });
  artifacts.record("fixture_loaded", { uploads: loadedScenario.scenario.uploads.map((u) => u.id) });

  function authedRequest(url: string, init: RequestInit = {}): Request {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${ACCEPTANCE_TOKEN}`);
    return new Request(url, { ...init, headers });
  }

  // ── Step 1: analyze (real upload processing + real AI-shaped call) ──────
  const uploadUpload = loadedScenario.scenario.uploads.find((u) => u.isPrimary) ?? loadedScenario.scenario.uploads[0];
  const uploadBytes = readFileSync(loadedScenario.uploadPaths[uploadUpload.id]);
  const form = new FormData();
  form.append("document", new File([uploadBytes], uploadUpload.file, { type: uploadUpload.mimeType }));

  const analyzeResponse = await artifacts.timed("analyze", () =>
    AnalyzeRoute.server.handlers.POST({ request: authedRequest("https://appeal-mail.test/api/workflows/claim-denial-letter/analyze", { method: "POST", body: form }) }),
  );
  const analyzeBody = await analyzeResponse.json();
  checks.push({ name: "workflow", status: analyzeResponse.status === 200 && analyzeBody.ok ? "pass" : "fail" });
  checks.push({ name: "uploads", status: analyzeResponse.status === 200 && analyzeBody.ok ? "pass" : "fail" });

  if (analyzeResponse.status !== 200 || !analyzeBody.ok) {
    failures.push({
      code: "WORKFLOW_EXECUTION_FAILED",
      message: `analyze failed (${analyzeResponse.status}): ${analyzeBody.error ?? "unknown error"}`,
      severity: "hard_failure",
    });
    return finish();
  }
  artifacts.record("upload_added", { uploadId: uploadUpload.id });
  artifacts.record("analysis_completed", { appealId: analyzeBody.appealId });
  const appealId = analyzeBody.appealId as string;
  checks.push({ name: "analysis", status: "pass" });

  // ── Step 2: draft ─────────────────────────────────────────────────────
  const draftResponse = await artifacts.timed("document_generated", () =>
    DraftRoute.server.handlers.POST({
      request: authedRequest("https://appeal-mail.test/api/workflows/claim-denial-letter/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appealId }),
      }),
    }),
  );
  const draftBody = await draftResponse.json();
  checks.push({ name: "documentGeneration", status: draftResponse.status === 200 && draftBody.ok ? "pass" : "fail" });
  if (draftResponse.status !== 200 || !draftBody.ok) {
    failures.push({
      code: "WORKFLOW_EXECUTION_FAILED",
      message: `draft failed (${draftResponse.status}): ${draftBody.error ?? JSON.stringify(draftBody)}`,
      severity: "hard_failure",
      context: { blockingFindings: draftBody.blockingFindings },
    });
    checks.push({ name: "payment", status: "blocked" });
    checks.push({ name: "packetAssembly", status: "blocked" });
    checks.push({ name: "mailSimulation", status: "blocked" });
    return finish();
  }

  // ── Step 3: approve ───────────────────────────────────────────────────
  const intake = loadedScenario.scenario.intake as { recipient: Record<string, unknown>; mailingMethod: string };
  const approveResponse = await artifacts.timed("packet_started", () =>
    ApproveRoute.server.handlers.POST({
      request: authedRequest("https://appeal-mail.test/api/workflows/claim-denial-letter/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appealId, recipient: intake.recipient, mailingMethod: intake.mailingMethod }),
      }),
    }),
  );
  const approveBody = await approveResponse.json();

  if (approveResponse.status !== 200 || !approveBody.ok) {
    checks.push({ name: "packetAssembly", status: "fail" });
    checks.push({ name: "payment", status: "blocked" });
    checks.push({ name: "mailSimulation", status: "blocked" });
    failures.push({
      code: "WORKFLOW_EXECUTION_FAILED",
      message:
        `approve rejected the appeal (${approveResponse.status}): ${approveBody.error ?? "unknown error"}. ` +
        `Readiness review score=${approveBody.review?.score ?? "?"}, issuesRequiringAttention=${approveBody.review?.issuesRequiringAttention ?? "?"}.`,
      severity: "hard_failure",
      context: { review: approveBody.review },
    });
    return finish();
  }
  checks.push({ name: "packetAssembly", status: "pass" });
  artifacts.record("packet_completed", { packetId: approveBody.packet.id, review: approveBody.review });

  // ── Step 4: checkout (real Stripe-shaped session, no network) ────────
  const checkoutResponse = await artifacts.timed("payment_requested", () =>
    CheckoutRoute.server.handlers.POST({
      request: authedRequest("https://appeal-mail.test/api/workflows/claim-denial-letter/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appealId }),
      }),
    }),
  );
  const checkoutBody = await checkoutResponse.json();
  if (checkoutResponse.status !== 200 || !checkoutBody.ok) {
    checks.push({ name: "payment", status: "fail" });
    checks.push({ name: "mailSimulation", status: "blocked" });
    failures.push({
      code: "PAYMENT_SIMULATION_FAILED",
      message: `checkout failed (${checkoutResponse.status}): ${checkoutBody.error ?? "unknown error"}`,
      severity: "hard_failure",
    });
    return finish();
  }
  const sessionId = checkoutBody.sessionId as string;

  // ── Step 5: simulate the Stripe webhook, then replay it twice more to
  // prove fulfillment idempotency. ─────────────────────────────────────
  const event = testState.stripeMock.buildCheckoutCompletedEvent(sessionId);
  const deliverWebhook = () =>
    WebhookRoute.server.handlers.POST({
      request: authedRequest("https://appeal-mail.test/api/stripe-webhook", {
        method: "POST",
        headers: { "stripe-signature": "test-signature" },
        body: JSON.stringify(event),
      }),
    });

  const firstDelivery = await artifacts.timed("payment_simulated_success", deliverWebhook);
  const firstDeliveryBody = await firstDelivery.json();
  artifacts.record("payment_webhook_processed", { status: firstDelivery.status, body: firstDeliveryBody });

  if (firstDelivery.status !== 200 || firstDeliveryBody.error) {
    checks.push({ name: "payment", status: "fail" });
    checks.push({ name: "mailSimulation", status: "blocked" });
    failures.push({
      code: "PAYMENT_SIMULATION_FAILED",
      message: `Stripe webhook delivery failed (${firstDelivery.status}): ${firstDeliveryBody.error ?? JSON.stringify(firstDeliveryBody)}`,
      severity: "hard_failure",
    });
    return finish();
  }
  checks.push({ name: "payment", status: "pass" });

  const secondDelivery = await deliverWebhook();
  const thirdDelivery = await deliverWebhook();
  await secondDelivery.json();
  await thirdDelivery.json();

  const uniqueMailpieces = testState.mailingClientHandle.uniqueMailpieceCount();
  const fulfillmentIdempotent = uniqueMailpieces === 1;
  checks.push({ name: "paymentIdempotency" as any, status: fulfillmentIdempotent ? "pass" : "fail" });
  if (!fulfillmentIdempotent) {
    failures.push({
      code: "PAYMENT_DUPLICATE_FULFILLMENT",
      message: `Replaying the successful payment webhook 3 times produced ${uniqueMailpieces} distinct mailpieces (expected 1).`,
      severity: "hard_failure",
      context: { webhookDeliveries: testState.stripeMock.webhookDeliveries, createCommunicationCalls: testState.mailingClientHandle.createCommunicationCalls },
    });
  }

  // ── Step 6: packet manifest + requested-upload verification ─────────
  const documents = [...testState.mailingClientHandle.documents.values()];
  const mailedDocument = documents[documents.length - 1];
  const manifest: PacketManifest = { packetId: approveBody.packet.id, items: [] };

  if (!mailedDocument) {
    checks.push({ name: "requestedUploads", status: "fail" });
    checks.push({ name: "pdfPreflight", status: "blocked" });
    failures.push({ code: "PDF_GENERATION_FAILED", message: "No document was ever uploaded to the mailing provider.", severity: "hard_failure" });
  } else {
    packetBytes = mailedDocument.bytes;
    packetPath = artifacts.writeBytes("packet/mail-ready-packet.pdf", packetBytes);
    manifest.items.push({ type: "generated", name: "response-letter.pdf", pages: 0 });

    const attachedUploadShas = new Set((mailedDocument.packetManifest ?? []).map((entry) => entry.sha256));
    const requestedUploads = loadedScenario.scenario.uploads.filter((u) => u.includeInMail);
    let missingUploads = 0;
    for (const upload of requestedUploads) {
      const bytes = readFileSync(loadedScenario.uploadPaths[upload.id]);
      const sha256 = computeSha256(bytes);
      const included = attachedUploadShas.has(sha256);
      if (!included) missingUploads += 1;
      manifest.items.push({ type: "user_upload", uploadId: upload.id, name: upload.file, pages: 0, includeInMail: upload.includeInMail, sha256 });
    }

    artifacts.writeJson("packet-manifest.json", manifest);

    if (missingUploads > 0) {
      checks.push({ name: "requestedUploads", status: "fail" });
      failures.push({
        code: "PACKET_UPLOAD_MISSING",
        message: `${missingUploads} of ${requestedUploads.length} upload(s) marked includeInMail were not present in the final mailed PDF.`,
        severity: "hard_failure",
        context: { requestedUploadIds: requestedUploads.map((u) => u.id) },
      });
    } else {
      checks.push({ name: "requestedUploads", status: "pass" });
    }

    // ── Step 7+8: PDF preflight, text checks, and page rendering ─────────
    const structure = await inspectPdfStructure(packetBytes);
    const content = await inspectPdfContent(packetBytes, { render: { outDir: artifacts.path("screenshots") } });
    const placeholders = findPlaceholders(content.text);
    const mustContainMisses = (loadedScenario.expected.mustContain ?? []).filter((needle) => !content.text.includes(needle));
    const mustNotContainHits = (loadedScenario.expected.mustNotContain ?? []).filter((needle) => content.text.toLowerCase().includes(needle.toLowerCase()));

    manifest.items[0].pages = structure.pageCount;
    artifacts.writeJson("packet-manifest.json", manifest);

    const preflightOk = structure.parses && structure.pageCount > 0 && !structure.encrypted && placeholders.length === 0 && mustContainMisses.length === 0 && mustNotContainHits.length === 0;
    checks.push({ name: "pdfPreflight", status: preflightOk ? "pass" : "fail" });
    if (!structure.parses) failures.push({ code: "PDF_INVALID", message: `Mailed PDF does not parse: ${structure.error}`, severity: "hard_failure" });
    if (structure.parses && structure.pageCount === 0) failures.push({ code: "PDF_INVALID", message: "Mailed PDF has zero pages.", severity: "hard_failure" });
    if (placeholders.length) {
      failures.push({
        code: "PDF_PLACEHOLDER_PRESENT",
        message:
          `Mailed PDF contains unresolved placeholder text: ${placeholders.join(", ")}. Root cause: ` +
          `apps/verticals/appeal-mail/src/routes/api/workflows/claim-denial-letter/draft.ts unconditionally ` +
          `appends "\\n\\nSincerely,\\n[Your Name]" to the persisted draft regardless of what the AI drafted or ` +
          `whether the customer later edits it in the wizard textarea -- see src/domain/review.ts's ` +
          `missing_signature check (now warns on this, but does not block approval) and ` +
          `context/FACTORY_STATUS.md for the full list of ~24 affected workflows.`,
        severity: "hard_failure",
      });
    }
    if (mustContainMisses.length) failures.push({ code: "EXPECTATION_NOT_MET", message: `Mailed PDF is missing required content: ${mustContainMisses.join(", ")}`, severity: "hard_failure" });
    if (mustNotContainHits.length) failures.push({ code: "EXPECTATION_NOT_MET", message: `Mailed PDF contains forbidden content: ${mustNotContainHits.join(", ")}`, severity: "hard_failure" });

    artifacts.record("page_rendering", { rendered: content.render.rendered, pageCount: content.render.pageFiles.length, reason: content.render.reason });
  }

  // ── Step 9: Lob simulation + idempotency ───────────────────────────
  artifacts.record("mail_simulation_started");
  const lobRecord = testState.mailingClientHandle.lobSimulations[0];
  if (!lobRecord) {
    checks.push({ name: "mailSimulation", status: "fail" });
    failures.push({ code: "MAIL_REQUEST_INVALID", message: "No mail request was ever constructed.", severity: "hard_failure" });
  } else {
    lobRecord.pdfPath = packetPath ?? "";
    lobRecord.pageCount = manifest.items[0]?.pages ?? null;
    artifacts.writeJson("lob-simulation.json", lobRecord);
    checks.push({ name: "mailSimulation", status: "pass" });
  }
  checks.push({ name: "mailDuplicateProtection" as any, status: fulfillmentIdempotent ? "pass" : "fail" });
  artifacts.record("mail_simulation_completed");

  artifacts.writeJson("stripe-simulation.json", {
    checkoutSessionId: sessionId,
    amountCents: event.data.object.amount_total,
    currency: event.data.object.currency,
    metadata: event.data.object.metadata,
    webhookDeliveries: testState.stripeMock.webhookDeliveries,
    fulfillmentInvocations: testState.mailingClientHandle.createCommunicationCalls,
  });

  return finish();

  async function finish() {
    artifacts.record("test_finished");
    const traceFile = artifacts.flushTrace();
    const report = buildReport({
      runId: artifacts.runId,
      workflow: WORKFLOW_ID,
      scenario: scenarioId,
      startedAt,
      checks,
      failures,
      artifacts: {
        report: artifacts.path("report.json"),
        trace: traceFile,
        manifest: artifacts.path("packet-manifest.json"),
        packet: packetPath,
        screenshots: artifacts.path("screenshots"),
        runDir: artifacts.runDir,
      },
    });
    artifacts.writeJson("report.json", report);
    artifacts.writeJson("workflow-state.json", { appealId, appeals: testState.fakeSupabase.tables.appeals ?? [] });
  }
});
