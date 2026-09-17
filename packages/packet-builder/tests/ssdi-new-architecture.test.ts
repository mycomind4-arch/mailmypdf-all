import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { computeSha256 } from "../../documents/src/index.ts";
import {
  assemblePacket,
  generateLetterPdf,
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

function packetRow(input: Partial<PacketDocumentRow> & Pick<PacketDocumentRow, "document_id" | "safe_filename" | "sha256">): PacketDocumentRow {
  return {
    document_id: input.document_id,
    role: input.role ?? "evidence",
    evidence_kind: input.evidence_kind ?? "medical_records",
    safe_filename: input.safe_filename,
    mime_type: input.mime_type ?? "application/pdf",
    size_bytes: input.size_bytes ?? 0,
    sha256: input.sha256,
    storage_path: input.storage_path ?? `user-1/${input.document_id}/${input.safe_filename}`,
    security_status: input.security_status ?? "clean",
    included: input.included ?? true,
    position: input.position ?? 1,
  };
}

function runtimeDocument(overrides: Partial<WorkflowMatterDocument> = {}): WorkflowMatterDocument {
  return {
    id: "attachment-1",
    documentId: "source-1",
    role: "subject_notice",
    evidenceKind: null,
    pageCount: 1,
    included: false,
    position: 0,
    filename: "decision.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    securityStatus: "clean",
    usable: true,
    ...overrides,
  };
}

function preview(overrides: Partial<WorkflowPacketPreview> = {}): WorkflowPacketPreview {
  return {
    packetSha256: "a".repeat(64),
    responsePages: 2,
    supportingPages: 3,
    manifest: [
      {
        documentId: "ssa-561",
        role: "evidence",
        evidenceKind: "ssa_561",
        filename: "ssa-561-u2.normalized.pdf",
        sha256: "b".repeat(64),
        pageCount: 3,
      },
    ],
    quote: { totalCents: 1494 },
    ...overrides,
  };
}

test("letter PDF safely paginates wrapped text and smart punctuation", async () => {
  const body = Array.from({ length: 140 }, (_, index) =>
    `Paragraph ${index + 1}: This is a deliberately long line containing smart punctuation — including curly quotes “like this” and an apostrophe in claimant’s statement — so the renderer has to wrap it safely across multiple pages.`
  ).join("\n\n");
  const bytes = await generateLetterPdf({
    fromName: "Claimant Name",
    recipient: {
      name: "Social Security Administration",
      line1: "Office of Hearings Operations",
      city: "Baltimore",
      state: "MD",
      postal: "21235",
    },
    subject: "Request for Reconsideration",
    bodyText: body,
  });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 1);
});

test("packet assembly rejects attachment bytes that do not match the intake hash", async () => {
  const response = await generateLetterPdf({
    fromName: "Claimant",
    recipient: { name: "SSA", line1: "1 Main St", city: "Baltimore", state: "MD", postal: "21235" },
    subject: "Appeal",
    bodyText: "Please reconsider the denial.",
  });
  const actual = await loadForm("ssa-561-u2.normalized.pdf");
  const row = packetRow({
    document_id: "ssa-561",
    safe_filename: "ssa-561-u2.normalized.pdf",
    size_bytes: actual.byteLength,
    sha256: "0".repeat(64),
  });
  await assert.rejects(() => assemblePacket(response, [row], async () => actual), /hash mismatch/i);
});

test("SSDI new architecture declares the complete eight-step appeal workflow", () => {
  assert.deepEqual(SSDI_STEPS.map((step) => step.id), [
    "decision",
    "analysis",
    "claimant",
    "evidence",
    "draft",
    "forms",
    "review",
    "mail",
  ]);
  for (const capability of [
    "auth",
    "upload",
    "documentIntelligence",
    "ai",
    "drafting",
    "formFilling",
    "packetBuilding",
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
    security_status: "clean",
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
        id: "attachment-2",
        documentId: "evidence-1",
        role: "evidence",
        evidenceKind: "medical_records",
        included: true,
        position: 1,
        securityStatus: "quarantined",
        usable: false,
      }),
    ]),
    /included documents must be clean/i,
  );
});

test("medical SSDI packet uses the real SSA-561, SSA-3441, and SSA-827 PDFs", async () => {
  const response = await generateLetterPdf({
    fromName: "Claimant",
    recipient: { name: "SSA", line1: "1 Main St", city: "Baltimore", state: "MD", postal: "21235" },
    subject: "Appeal",
    bodyText: "Please reconsider the denial.",
  });

  const rows: PacketDocumentRow[] = [];
  const bytesById = new Map<string, Uint8Array>();
  for (const [index, form] of requiredSsdiFormsForBasis("medical").entries()) {
    const bytes = await loadForm(form.bundledMailReadyFilename);
    rows.push(packetRow({
      document_id: form.kind,
      evidence_kind: form.kind,
      safe_filename: form.bundledMailReadyFilename,
      size_bytes: bytes.byteLength,
      sha256: computeSha256(bytes),
      position: index + 1,
    }));
    bytesById.set(form.kind, bytes);
  }

  const packet = await assemblePacket(response, rows, async (row) => bytesById.get(row.document_id)!);
  assert.deepEqual(packet.manifest.map((entry) => entry.evidenceKind), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.ok(packet.supportingPages > 0);
  assert.equal(packet.packetSha256.length, 64);
});

test("exact SSDI packet approval is invalidated by any packet or price change", () => {
  const base = preview();
  const approval = createExactPacketApproval({
    approvalId: "approval-1",
    matterId: "matter-1",
    workflowId: SSDI_WORKFLOW_ID,
    preview: base,
    reviewed: { packetSha256: base.packetSha256, totalCents: base.quote.totalCents },
    recipient: {
      name: "Social Security Administration",
      line1: "Office of Hearings Operations",
      city: "Baltimore",
      state: "MD",
      postal: "21235",
    },
    mailClass: "certified",
    approvedBy: "user-1",
    approvedAt: "2026-09-17T00:00:00.000Z",
  });

  assert.doesNotThrow(() => assertPacketMatchesApproval(approval, base));
  assert.throws(
    () => assertPacketMatchesApproval(approval, preview({ packetSha256: "c".repeat(64) })),
    /packet changed/i,
  );
  assert.throws(
    () => assertPacketMatchesApproval(approval, preview({ quote: { totalCents: 1495 } })),
    /price changed/i,
  );
});

test("paid SSDI mailing is idempotent across repeated fulfillment delivery", async () => {
  const intent: MailingIntent = {
    id: "intent-1",
    idempotencyKey: "workflow-mail:approval-1",
    ownerId: "user-1",
    matterId: "matter-1",
    workflowId: SSDI_WORKFLOW_ID,
    verticalId: "appeal-mail",
    packetSha256: "a".repeat(64),
    recipientHash: hashRecipient({ name: "SSA", line1: "1 Main St", city: "Baltimore", state: "MD", postal: "21235" }),
    draftHash: hashDraft("Please reconsider the denial."),
    mailClass: "certified",
    status: "queued",
    providerOrderId: null,
    providerTrackingNumber: null,
    providerStatus: null,
    lastError: null,
    attempts: 0,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
  };

  let current = { ...intent };
  const store: MailingIntentStore = {
    async findByIdempotencyKey() { return { ...current }; },
    async insert(value) { current = { ...value }; return { ...current }; },
    async compareAndSetStatus({ expectedStatus, patch }) {
      if (current.status !== expectedStatus) return null;
      current = { ...current, ...patch, updatedAt: "2026-09-17T00:00:01.000Z" };
      return { ...current };
    },
  };

  let sends = 0;
  const client: MailMyPDFClient = {
    async sendPdf() {
      sends += 1;
      return { id: "mail-1", tracking_number: "9400", status: "mailed" };
    },
  };

  const first = await fulfillMailingIntent(intent, store, client);
  const second = await fulfillMailingIntent(intent, store, client);
  assert.equal(first.status, "submitted");
  assert.equal(second.status, "submitted");
  assert.equal(sends, 1);
});
