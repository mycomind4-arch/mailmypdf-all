/**
 * Studio Workflow Acceptance test for appeal-mail's car-insurance-appeal
 * workflow. This is the ONE place that knows how to drive this specific
 * workflow's real route handlers; the generic engine machinery (fixtures,
 * mock providers, PDF preflight/rendering, reporting) all comes from
 * @mailmypdf/workflow-acceptance. See
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md for the full design and
 * the specific finding this first run surfaces.
 *
 * Run via `pnpm studio workflow test car-insurance-appeal --json` from the
 * repo root (preferred -- goes through the one CLI every client shares), or
 * directly with `pnpm test:acceptance` from this package for local iteration.
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
const WORKFLOW_ID = "car-insurance-appeal";
const ACCEPTANCE_TOKEN = "studio-acceptance-token";
const TEST_USER = { id: "studio-test-user", email: "studio-acceptance@mailmypdf.test" };

const scenarioId = process.env.STUDIO_SCENARIO ?? "rear-end-liability-dispute";
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
    summary: `${f.insurerName} assigned ${f.claimantName} ${f.liabilityPercentage} comparative negligence, contradicting the police report.`,
    decision: "Claim decision letter with comparative-negligence liability finding",
    decisionType: "car_insurance_claim",
    issuer: f.insurerName,
    referenceNumber: f.claimNumber,
    claimNumber: f.claimNumber,
    policyNumber: f.policyNumber,
    adjusterName: f.adjusterName,
    decisionDate: f.decisionDate,
    deadline: f.appealDeadline,
    accidentDate: f.accidentDate,
    liabilityFinding: f.liabilityFinding,
    liabilityPercentage: f.liabilityPercentage,
    coverageFinding: f.coverageFinding,
    damageFinding: f.damageFinding,
    repairEstimateAmount: f.repairEstimateAmount,
    totalLossValue: "",
    isTotalLoss: false,
    rentalCoverage: f.rentalCoverage,
    policeReportNumber: f.policeReportNumber,
    denialReasons: [
      `${f.liabilityPercentage} comparative negligence assigned to the claimant`,
      "Rental reimbursement denied on the same comparative-negligence basis",
    ],
    keyFacts: [
      `Police report ${f.policeReportNumber}: ${f.policeReportFinding}`,
      `Independent repair estimate from ${f.independentEstimateSource}: ${f.independentEstimateAmount}`,
    ],
    evidenceMentioned: [`Police report ${f.policeReportNumber}`, "Independent body-shop repair estimate"],
    issues: [
      {
        issue: `Insurer's ${f.liabilityPercentage} comparative-negligence finding directly contradicts police report ${f.policeReportNumber}, which found the other driver 100% at fault.`,
        whyItMatters: f.policeReportFinding,
        evidenceNeeded: ["Certified copy of the police report"],
      },
      {
        issue: `Insurer's repair estimate of ${f.repairEstimateAmount} is well below the independent estimate of ${f.independentEstimateAmount}.`,
        whyItMatters: `${f.independentEstimateSource} estimate reflects actual required repairs.`,
        evidenceNeeded: ["Independent body-shop estimate"],
      },
    ],
    uncertainties: [],
    confidence: "high",
  };
}

function fixtureDraftText(): string {
  const f = facts();
  return [
    `Re: Appeal of Claim Decision -- Claim Number ${f.claimNumber}`,
    "",
    "Dear Claims Appeals Department,",
    "",
    `I am writing to appeal ${f.insurerName}'s decision dated ${f.decisionDate} on the above claim, ` +
      `which assigned me ${f.liabilityPercentage} comparative negligence for the collision on ${f.accidentDate}.`,
    "",
    `This finding directly contradicts police report ${f.policeReportNumber}, in which the responding officer found the other driver 100% at fault. ` +
      `I am enclosing a copy of that report and ask that the liability determination be reversed accordingly.`,
    "",
    `Separately, the claim decision valued my vehicle's repair at ${f.repairEstimateAmount}. An independent estimate from ${f.independentEstimateSource} ` +
      `puts the actual repair cost at ${f.independentEstimateAmount}. I am enclosing that estimate and ask that the claim be reprocessed at the correct amount.`,
    "",
    `Because the comparative-negligence finding is unsupported by the police report, I also ask that the denied rental reimbursement be reconsidered and approved.`,
    "",
    `Please reverse the liability determination, reprocess the claim using the independent repair estimate, and reconsider the rental reimbursement under Policy Section 4.2. ` +
      `I look forward to your response before the appeal deadline.`,
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

it(`car-insurance-appeal / ${scenarioId}`, async () => {
  const { Route: AnalyzeRoute } = await import("@/routes/api/workflows/car-insurance-appeal/analyze");
  const { Route: DraftRoute } = await import("@/routes/api/workflows/car-insurance-appeal/draft");
  const { Route: ApproveRoute } = await import("@/routes/api/workflows/car-insurance-appeal/approve");
  const { Route: CheckoutRoute } = await import("@/routes/api/workflows/car-insurance-appeal/checkout");
  const { Route: WebhookRoute } = await import("@/routes/api/stripe-webhook");

  const artifacts = ArtifactStore.create(RUNS_DIR, WORKFLOW_ID, scenarioId, explicitRunId);
  const startedAt = new Date().toISOString();
  const checks: CheckResult[] = [];
  const failures: AcceptanceFailure[] = [];
  // Declared up front (not just where first assigned) so the `finish()`
  // closure below can reference them safely from any early-return point.
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
    AnalyzeRoute.server.handlers.POST({ request: authedRequest("https://appeal-mail.test/api/workflows/car-insurance-appeal/analyze", { method: "POST", body: form }) }),
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
      request: authedRequest("https://appeal-mail.test/api/workflows/car-insurance-appeal/draft", {
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
      request: authedRequest("https://appeal-mail.test/api/workflows/car-insurance-appeal/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appealId, recipient: intake.recipient, mailingMethod: intake.mailingMethod }),
      }),
    }),
  );
  const approveBody = await approveResponse.json();

  if (approveResponse.status !== 200 || !approveBody.ok) {
    // See docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md ("Known finding:
    // car-insurance-appeal approval is currently unreachable") for the
    // history here: this branch used to fire unconditionally until
    // analyze.ts's evidence-linkage and appealInstructions gaps were fixed.
    // If it fires now, treat the score/issues below as a fresh regression,
    // not that same historical cause.
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
  artifacts.record("packet_completed", { packetId: approveBody.packet.id });

  // ── Step 4: checkout (real Stripe-shaped session, no network) ────────
  const checkoutResponse = await artifacts.timed("payment_requested", () =>
    CheckoutRoute.server.handlers.POST({
      request: authedRequest("https://appeal-mail.test/api/workflows/car-insurance-appeal/checkout", {
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
  // prove fulfillment idempotency (hard requirement -- see "Stripe
  // Idempotency Test"). ─────────────────────────────────────────────────
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
        message:
          `${missingUploads} of ${requestedUploads.length} upload(s) marked includeInMail were not present in the final mailed PDF. ` +
          `Root cause: apps/verticals/appeal-mail/src/platform/mailmypdf-client.ts's MailMyPDFClient adapter never implements the optional ` +
          `uploadPacket() method, so @mailmypdf/payment-fulfillment's fulfillMailingIntent() always falls back to uploadDocument() -- the ` +
          `letter text alone, with no attachments -- even though the appeal's packet.attachmentIds/exhibitIndex list evidence to enclose.`,
        severity: "hard_failure",
        context: { requestedUploadIds: requestedUploads.map((u) => u.id) },
      });
    } else {
      checks.push({ name: "requestedUploads", status: "pass" });
    }

    // ── Step 7+8: PDF preflight, text checks, and page rendering ─────────
    // One pdfjs-dist session does both text extraction and rendering -- see
    // inspectPdfContent()'s doc comment for why calling pdfjs-dist twice per
    // process is unsafe in this Node/legacy-worker setup.
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
    if (placeholders.length) failures.push({ code: "PDF_PLACEHOLDER_PRESENT", message: `Mailed PDF contains unresolved placeholder text: ${placeholders.join(", ")}`, severity: "hard_failure" });
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
    // Reuse the page count already measured above rather than re-parsing
    // packetBytes: pdfjs-dist's postMessage-based fake worker (see section 11
    // in docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md) appears to transfer
    // rather than copy the underlying buffer, so a second parse of the same
    // Uint8Array after inspectPdfContent() has run against it can see it as
    // empty.
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
    // The CLI reads report.json from disk and is the authoritative
    // PASS/FAIL signal -- this test intentionally never throws on a
    // business-outcome failure, only on a genuine harness crash.
  }
});
