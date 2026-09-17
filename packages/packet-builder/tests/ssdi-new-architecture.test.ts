import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { computeSha256 } from "../../documents/src/index.ts";
import {
  assemblePacket,
  generateLetterPdf,
  normalizeTrustedStaticPdfForMailing,
  type PacketDocumentRow,
} from "../src/index.ts";
import {
  createExactPacketApproval,
  assertPacketMatchesApproval,
  requireCleanSourceDocument,
  requireIncludedDocumentsReady,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "../../workflows/src/index.ts";
import {
  fulfillMailingIntent,
  hashDraft,
  hashRecipient,
  type MailingIntent,
  type MailingIntentStore,
  type MailMyPDFClient,
} from "../../payment-fulfillment/src/index.ts";
import ssdiDenialManifest from "../../../appeal-mail/workflows/appeal-ssdi-denial/manifest.ts";
import {
  SSDI_REQUIRED_FORMS,
  SSDI_STEPS,
  hasRequiredSsdiForms,
  isSsdiReconsiderationStage,
  requiredSsdiFormsForBasis,
} from "../../../appeal-mail/workflows/appeal-ssdi-denial/start/workflow.ts";

const FORM_ROOT = new URL("../../../appeal-mail/workflows/appeal-ssdi-denial/forms/generated/", import.meta.url);

async function loadForm(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL(name, FORM_ROOT)));
}

async function normalizeBundledForm(label: string, filename: string): Promise<Uint8Array> {
  const raw = await loadForm(filename);
  try {
    return await normalizeTrustedStaticPdfForMailing(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} (${filename}) normalization failed: ${message}`, { cause: error });
  }
}

function packetRow(id: string, filename: string, kind: string, bytes: Uint8Array, position: number): PacketDocumentRow {
  return {
    document_id: id,
    role: "evidence",
    evidence_kind: kind,
    page_count: null,
    position,
    sha256: computeSha256(bytes),
    storage_path: `acceptance/${filename}`,
    safe_filename: filename,
    mime_type: "application/pdf",
  };
}

function runtimeDocument(overrides: Partial<WorkflowMatterDocument> = {}): WorkflowMatterDocument {
  return {
    id: "link-1",
    documentId: "doc-1",
    role: "subject_notice",
    evidenceKind: null,
    pageCount: 1,
    included: false,
    position: 0,
    filename: "ssdi-denial.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    securityStatus: "clean",
    usable: true,
    ...overrides,
  };
}

test("SSDI new architecture declares the complete eight-step appeal workflow", () => {
  assert.equal(ssdiDenialManifest.manifest.id, "appeal-ssdi-denial");
  assert.equal(ssdiDenialManifest.manifest.vertical, "appeal-mail");
  assert.equal(ssdiDenialManifest.manifest.pipeline, "P03_APPEAL");
  assert.deepEqual(
    SSDI_STEPS.map((step) => step.id),
    ["decision", "analysis", "claimant", "evidence", "draft", "forms", "review", "mail"],
  );
  assert.deepEqual(
    ssdiDenialManifest.manifest.steps?.map((step) => step.id),
    SSDI_STEPS.map((step) => step.id),
  );
  for (const capability of [
    "secureUpload",
    "documentScanning",
    "visionAnalysis",
    "facts",
    "evidence",
    "draft",
    "validation",
    "packetAssembly",
    "pricing",
    "payment",
    "mailing",
    "tracking",
    "proofAudit",
    "archive",
  ] as const) {
    assert.ok(ssdiDenialManifest.manifest.requiredCapabilities.includes(capability), `missing ${capability}`);
  }
});

test("SSDI form rules fail closed and distinguish medical from non-medical reconsideration", () => {
  assert.equal(isSsdiReconsiderationStage("reconsideration"), true);
  assert.equal(isSsdiReconsiderationStage("hearing"), false);
  assert.equal(isSsdiReconsiderationStage("unknown"), false);

  assert.deepEqual(requiredSsdiFormsForBasis("medical").map((form) => form.kind), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.deepEqual(requiredSsdiFormsForBasis("nonmedical").map((form) => form.kind), ["ssa_561"]);
  assert.deepEqual(requiredSsdiFormsForBasis("unknown"), []);

  const cleanForms = SSDI_REQUIRED_FORMS.map((form, index) => ({
    evidence_kind: form.kind,
    included: true,
    usable: true,
    position: index + 1,
  }));
  assert.equal(hasRequiredSsdiForms(cleanForms, "medical"), true);
  assert.equal(hasRequiredSsdiForms(cleanForms.slice(0, 1), "medical"), false);
  assert.equal(hasRequiredSsdiForms(cleanForms.slice(0, 1), "nonmedical"), true);
  assert.equal(hasRequiredSsdiForms(cleanForms, "unknown"), false);
});

test("shared runtime blocks unscanned SSDI source and included evidence", () => {
  assert.throws(
    () => requireCleanSourceDocument([runtimeDocument({ securityStatus: "quarantined", usable: false })]),
    /clear security scanning/i,
  );

  assert.throws(
    () => requireIncludedDocumentsReady([
      runtimeDocument(),
      runtimeDocument({
        id: "link-2",
        documentId: "doc-2",
        role: "evidence",
        evidenceKind: "medical_records",
        included: true,
        securityStatus: "quarantined",
        usable: false,
      }),
    ]),
    /included document/i,
  );
});

test("medical SSDI packet uses the real SSA-561, SSA-3441, and SSA-827 PDFs", async () => {
  // Normalize sequentially so a malformed official form is identified by
  // name in CI instead of being hidden by Promise.all's first rejection.
  const ssa561 = await loadForm("ssa-561-u2.normalized.pdf");
  const ssa3441 = await normalizeBundledForm("SSA-3441", "ssa-3441.pdf");
  const ssa827 = await normalizeBundledForm("SSA-827", "ssa-827.pdf");

  for (const [name, bytes] of [["SSA-561", ssa561], ["SSA-3441", ssa3441], ["SSA-827", ssa827]] as const) {
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() > 0, `${name} is not a readable normalized PDF`);
  }

  const response = await generateLetterPdf({
    letterText: "I request reconsideration of the SSDI denial described in the attached official forms and supporting record.",
    senderName: "Test Claimant",
    senderLine1: "123 Main St",
    senderCity: "Arcata",
    senderState: "CA",
    senderPostal: "95521",
    recipientName: "Social Security Administration",
    recipientLine1: "123 SSA Way",
    recipientCity: "Baltimore",
    recipientState: "MD",
    recipientPostal: "21235",
  });

  const rows = [
    packetRow("form-561", "ssa-561-u2.pdf", "ssa_561", ssa561, 1),
    packetRow("form-3441", "ssa-3441.pdf", "ssa_3441", ssa3441, 2),
    packetRow("form-827", "ssa-827.pdf", "ssa_827", ssa827, 3),
  ];
  const bytesById = new Map([
    ["form-561", ssa561],
    ["form-3441", ssa3441],
    ["form-827", ssa827],
  ]);

  const first = await assemblePacket(response, rows, async (row) => bytesById.get(row.document_id)!);
  const second = await assemblePacket(response, rows, async (row) => bytesById.get(row.document_id)!);

  assert.equal(first.manifest.length, 3);
  assert.deepEqual(first.manifest.map((entry) => entry.evidenceKind), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.ok(first.supportingPages >= 3);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.sha256, second.sha256, "same reviewed packet must have a deterministic hash");

  const merged = await PDFDocument.load(first.bytes);
  assert.equal(merged.getPageCount(), first.responsePages + first.supportingPages);
});

test("exact SSDI packet approval is invalidated by any packet or price change", () => {
  const preview: WorkflowPacketPreview = {
    packetSha256: "a".repeat(64),
    responsePages: 1,
    supportingPages: 3,
    manifest: [],
    quote: { totalCents: 1499 },
  };
  const approval = createExactPacketApproval({
    approvalId: "approval-1",
    matterId: "matter-1",
    workflowId: "appeal-ssdi-denial",
    preview,
    recipient: {
      name: "Social Security Administration",
      line1: "123 SSA Way",
      city: "Baltimore",
      state: "MD",
      postal: "21235",
    },
    mailClass: "certified",
    approvedBy: "user-1",
    approvedAt: "2026-09-17T00:00:00.000Z",
  });
  assert.doesNotThrow(() => assertPacketMatchesApproval(approval, preview));
  assert.throws(
    () => assertPacketMatchesApproval(approval, { ...preview, packetSha256: "b".repeat(64) }),
    /changed after approval/i,
  );
  assert.throws(
    () => assertPacketMatchesApproval(approval, { ...preview, quote: { totalCents: 1599 } }),
    /price changed/i,
  );
});

test("paid SSDI mailing is idempotent across repeated fulfillment delivery", async () => {
  const recipient = {
    name: "Social Security Administration",
    address1: "123 SSA Way",
    city: "Baltimore",
    state: "MD",
    zip: "21235",
  };
  const intent: MailingIntent = {
    id: "intent-1",
    owner_id: "user-1",
    workflow_id: "appeal-ssdi-denial",
    case_id: "matter-1",
    approval_id: "approval-1",
    draft_content: "Approved SSDI packet reference",
    recipient,
    mailing_method: "certified",
    approved_draft_hash: hashDraft("Approved SSDI packet reference"),
    approved_recipient_hash: hashRecipient(recipient),
    stripe_session_id: "cs_test_ssdi",
    stripe_price_cents: 1499,
    status: "approved",
    created_at: "2026-09-17T00:00:00.000Z",
    updated_at: "2026-09-17T00:00:00.000Z",
  };

  const state = { intent: { ...intent }, communicationCalls: 0 };
  const store: MailingIntentStore = {
    async load(id) { return id === state.intent.id ? state.intent : null; },
    async loadByStripeSession(sessionId) { return state.intent.stripe_session_id === sessionId ? state.intent : null; },
    async updateStatus(_id, update) { Object.assign(state.intent, update); },
  };
  const client: MailMyPDFClient = {
    async uploadDocument() { return { id: "doc-final" }; },
    async createCommunication() {
      state.communicationCalls += 1;
      return { id: "mail-order-1", tracking_number: "TRACK123", status: "submitted" };
    },
  };

  const first = await fulfillMailingIntent(store, client, "intent-1", "cs_test_ssdi", "pi_test_ssdi", "stripe-webhook", "appeal-mail");
  const second = await fulfillMailingIntent(store, client, "intent-1", "cs_test_ssdi", "pi_test_ssdi", "browser-return", "appeal-mail");

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.idempotent, true);
  assert.equal(state.communicationCalls, 1, "replayed fulfillment must not create a second mailing");
});
