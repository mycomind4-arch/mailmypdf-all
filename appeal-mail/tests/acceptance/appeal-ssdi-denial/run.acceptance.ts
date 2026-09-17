import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { assemblePacket, generatePlainTextPdf, type PacketDocumentRow } from "@mailmypdf/packet-builder";
import {
  fulfillMailingIntent,
  hashDraft,
  hashEvidenceSnapshot,
  hashRecipient,
  type MailMyPDFClient,
  type MailingIntent,
  type MailingIntentStore,
} from "@mailmypdf/payment-fulfillment";
import {
  createCustodyEvent,
  createMatterArchiveManifest,
  createVerifiableProofBundle,
  verifyMatterArchiveManifest,
  verifyProofBundle,
} from "@mailmypdf/proof";

const workflowDir = resolve(process.cwd(), "workflows/appeal-ssdi-denial");
const generatedFormsDir = resolve(workflowDir, "forms/generated");

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readTrustedForm(filename: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(generatedFormsDir, filename)));
}

class MemoryIntentStore implements MailingIntentStore {
  constructor(public intent: MailingIntent) {}

  async load(intentId: string): Promise<MailingIntent | null> {
    return this.intent.id === intentId ? this.intent : null;
  }

  async loadByStripeSession(sessionId: string): Promise<MailingIntent | null> {
    return this.intent.stripe_session_id === sessionId ? this.intent : null;
  }

  async updateStatus(intentId: string, update: Partial<MailingIntent>): Promise<void> {
    if (intentId !== this.intent.id) throw new Error("unknown mailing intent");
    this.intent = { ...this.intent, ...update, updated_at: new Date().toISOString() };
  }
}

describe("SSDI denial production acceptance", () => {
  it("builds the normalized SSA packet, preserves approval integrity, fulfills once, and produces verifiable proof", async () => {
    const formSpecs = [
      ["ssa_561", "ssa-561-u2.normalized.pdf"],
      ["ssa_3441", "ssa-3441.normalized.pdf"],
      ["ssa_827", "ssa-827.normalized.pdf"],
    ] as const;

    const formBytes = new Map<string, Uint8Array>();
    const documents: PacketDocumentRow[] = [];

    for (let index = 0; index < formSpecs.length; index += 1) {
      const [kind, filename] = formSpecs[index]!;
      const bytes = await readTrustedForm(filename);
      expect(bytes.byteLength).toBeGreaterThan(1_000);
      expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
      formBytes.set(filename, bytes);
      documents.push({
        document_id: `form-${index + 1}`,
        role: "evidence",
        evidence_kind: kind,
        page_count: null,
        position: index + 1,
        sha256: sha256Bytes(bytes),
        storage_path: `trusted:ssdi/${filename}`,
        safe_filename: filename,
        mime_type: "application/pdf",
      });
    }

    const draftContent = [
      "Request for Reconsideration",
      "I disagree with the SSDI denial and request reconsideration.",
      "Please review the enclosed appeal forms and supporting evidence.",
    ].join("\n\n");

    const responsePdf = await generatePlainTextPdf(draftContent);
    const packet = await assemblePacket(
      responsePdf,
      documents,
      async (row) => {
        const bytes = formBytes.get(row.safe_filename);
        if (!bytes) throw new Error(`missing trusted form ${row.safe_filename}`);
        return bytes;
      },
    );

    expect(packet.bytes.byteLength).toBeGreaterThan(responsePdf.byteLength);
    expect(packet.manifest).toHaveLength(3);
    expect(packet.sha256).toMatch(/^[0-9a-f]{64}$/);
    const approvedPacketHash = packet.sha256;

    const recipient = {
      name: "Social Security Administration",
      address1: "123 SSA Way",
      city: "Baltimore",
      state: "MD",
      zip: "21235",
    };

    const evidenceSnapshot = documents.map((document) => ({
      id: document.document_id,
      requirementId: document.evidence_kind ?? undefined,
      fileName: document.safe_filename,
      fileType: document.mime_type,
      fileSize: formBytes.get(document.safe_filename)!.byteLength,
      fileHash: document.sha256,
      storagePath: document.storage_path,
      status: "approved",
    }));

    const now = new Date().toISOString();
    const intent: MailingIntent = {
      id: "ssdi-intent-1",
      owner_id: "acceptance-user",
      workflow_id: "appeal-ssdi-denial",
      case_id: "ssdi-case-1",
      approval_id: "ssdi-approval-1",
      draft_content: draftContent,
      recipient,
      mailing_method: "certified",
      matter_reference: "SSDI reconsideration",
      matter_type: "appeal-mail",
      approved_draft_hash: hashDraft(draftContent),
      approved_recipient_hash: hashRecipient(recipient),
      approved_evidence_hash: hashEvidenceSnapshot(evidenceSnapshot),
      evidence_snapshot: evidenceSnapshot,
      stripe_session_id: "cs_test_ssdi_1",
      stripe_price_cents: 1494,
      status: "approved",
      created_at: now,
      updated_at: now,
    };

    const store = new MemoryIntentStore(intent);
    let providerSubmissions = 0;
    let uploadedPacketHash = "";

    const client: MailMyPDFClient = {
      async uploadDocument() {
        throw new Error("SSDI acceptance must upload the approved packet, not raw text");
      },
      async uploadPacket() {
        uploadedPacketHash = approvedPacketHash;
        return { id: "doc-ssdi-approved-packet" };
      },
      async createCommunication(params) {
        providerSubmissions += 1;
        expect(params.idempotency_key).toBe("stripe:cs_test_ssdi_1");
        expect(params.mail_type).toBe("certified");
        return {
          id: "lob-letter-ssdi-1",
          tracking_number: "9400111899223856928499",
          status: "submitted",
        };
      },
    };

    const first = await fulfillMailingIntent(
      store,
      client,
      intent.id,
      "cs_test_ssdi_1",
      "pi_test_ssdi_1",
      "stripe-webhook",
      "appeal-mail",
    );

    expect(first.success).toBe(true);
    expect(first.providerOrderId).toBe("lob-letter-ssdi-1");
    expect(first.trackingNumber).toBe("9400111899223856928499");
    expect(providerSubmissions).toBe(1);
    expect(uploadedPacketHash).toBe(approvedPacketHash);

    const second = await fulfillMailingIntent(
      store,
      client,
      intent.id,
      "cs_test_ssdi_1",
      "pi_test_ssdi_1",
      "browser-return",
      "appeal-mail",
    );

    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(providerSubmissions).toBe(1);

    const approved = createCustodyEvent({
      priorEventHash: null,
      timestamp: "2026-09-16T12:00:00.000Z",
      eventType: "packet.approved",
      description: "User approved the exact SSDI packet.",
      metadata: { packetSha256: approvedPacketHash },
    });
    const mailed = createCustodyEvent({
      priorEventHash: approved.eventHash,
      timestamp: "2026-09-16T12:01:00.000Z",
      eventType: "mail.submitted",
      description: "Approved SSDI packet submitted to mailing provider.",
      metadata: { providerOrderId: "lob-letter-ssdi-1" },
    });

    const proof = createVerifiableProofBundle({
      subjectId: intent.id,
      documentSha256: approvedPacketHash,
      mailingId: "lob-letter-ssdi-1",
      trackingNumber: "9400111899223856928499",
      sentAt: "2026-09-16T12:01:00.000Z",
      custodyChain: [approved, mailed],
      metadata: { workflowId: "appeal-ssdi-denial" },
    });
    expect(verifyProofBundle(proof)).toBe(true);

    const archive = createMatterArchiveManifest({
      matterId: "ssdi-case-1",
      workflowId: "appeal-ssdi-denial",
      finalDocumentSha256: approvedPacketHash,
      artifactIds: ["doc-ssdi-approved-packet", "lob-letter-ssdi-1"],
      proofBundleSha256: proof.bundleSha256,
      completedAt: "2026-09-16T12:02:00.000Z",
      createdAt: "2026-09-16T12:02:00.000Z",
    });
    expect(verifyMatterArchiveManifest(archive)).toBe(true);
  });

  it("fails closed when an approved draft is mutated before fulfillment", async () => {
    const recipient = {
      name: "Social Security Administration",
      address1: "123 SSA Way",
      city: "Baltimore",
      state: "MD",
      zip: "21235",
    };
    const approvedDraft = "Original approved SSDI reconsideration draft";
    const now = new Date().toISOString();
    const store = new MemoryIntentStore({
      id: "ssdi-intent-tamper",
      owner_id: "acceptance-user",
      workflow_id: "appeal-ssdi-denial",
      draft_content: `${approvedDraft} -- mutated`,
      recipient,
      mailing_method: "certified",
      approved_draft_hash: hashDraft(approvedDraft),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_ssdi_tamper",
      status: "approved",
      created_at: now,
      updated_at: now,
    });

    let submitted = false;
    const client: MailMyPDFClient = {
      async uploadDocument() {
        submitted = true;
        return { id: "should-not-upload" };
      },
      async createCommunication() {
        submitted = true;
        return { id: "should-not-mail" };
      },
    };

    const result = await fulfillMailingIntent(
      store,
      client,
      store.intent.id,
      "cs_test_ssdi_tamper",
      null,
      "stripe-webhook",
      "appeal-mail",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(submitted).toBe(false);
  });
});
