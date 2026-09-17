import { describe, expect, it } from "vitest";
import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import {
  fulfillMailingIntent,
  hashDraft,
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

class MemoryIntentStore implements MailingIntentStore {
  constructor(public intent: MailingIntent) {}
  async load(intentId: string): Promise<MailingIntent | null> { return this.intent.id === intentId ? this.intent : null; }
  async loadByStripeSession(sessionId: string): Promise<MailingIntent | null> { return this.intent.stripe_session_id === sessionId ? this.intent : null; }
  async updateStatus(intentId: string, update: Partial<MailingIntent>): Promise<void> {
    if (intentId !== this.intent.id) throw new Error("unknown mailing intent");
    this.intent = { ...this.intent, ...update, updated_at: new Date().toISOString() };
  }
}

describe("CP14 response production acceptance", () => {
  it("builds a mail-ready response, fulfills exactly once, and produces verifiable proof", async () => {
    const draftContent = [
      "Response to IRS CP14 Notice",
      "I am responding to the CP14 notice identified in this matter.",
      "The enclosed records support the facts stated in this response.",
    ].join("\n\n");
    const packetBytes = await generatePlainTextPdf(draftContent);
    expect(packetBytes.byteLength).toBeGreaterThan(500);

    const recipient = {
      name: "Internal Revenue Service",
      address1: "100 Notice Response Way",
      city: "Fresno",
      state: "CA",
      zip: "93725",
    };
    const now = new Date().toISOString();
    const intent: MailingIntent = {
      id: "cp14-intent-1",
      owner_id: "acceptance-user",
      workflow_id: "cp14-response",
      case_id: "cp14-case-1",
      approval_id: "cp14-approval-1",
      draft_content: draftContent,
      recipient,
      mailing_method: "certified",
      matter_reference: "IRS CP14 response",
      matter_type: "notice-respond",
      approved_draft_hash: hashDraft(draftContent),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_cp14_1",
      stripe_price_cents: 1494,
      status: "approved",
      created_at: now,
      updated_at: now,
    };

    const store = new MemoryIntentStore(intent);
    let providerSubmissions = 0;
    const client: MailMyPDFClient = {
      async uploadDocument() { return { id: "doc-cp14-packet" }; },
      async createCommunication(params) {
        providerSubmissions += 1;
        expect(params.idempotency_key).toBe("stripe:cs_test_cp14_1");
        expect(params.mail_type).toBe("certified");
        return { id: "lob-letter-cp14-1", tracking_number: "9400111899223856928018", status: "submitted" };
      },
    };

    const first = await fulfillMailingIntent(store, client, intent.id, "cs_test_cp14_1", "pi_test_cp14_1", "stripe-webhook", "notice-respond");
    expect(first.success).toBe(true);
    expect(providerSubmissions).toBe(1);

    const second = await fulfillMailingIntent(store, client, intent.id, "cs_test_cp14_1", "pi_test_cp14_1", "browser-return", "notice-respond");
    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(providerSubmissions).toBe(1);

    const approved = createCustodyEvent({
      priorEventHash: null,
      timestamp: "2026-09-17T07:00:00.000Z",
      eventType: "packet.approved",
      description: "User approved the exact CP14 response packet.",
      metadata: { workflowId: "cp14-response" },
    });
    const mailed = createCustodyEvent({
      priorEventHash: approved.eventHash,
      timestamp: "2026-09-17T07:01:00.000Z",
      eventType: "mail.submitted",
      description: "Approved CP14 response packet submitted to mailing provider.",
      metadata: { providerOrderId: "lob-letter-cp14-1" },
    });
    const proof = createVerifiableProofBundle({
      subjectId: intent.id,
      documentSha256: hashDraft(draftContent),
      mailingId: "lob-letter-cp14-1",
      trackingNumber: "9400111899223856928018",
      sentAt: "2026-09-17T07:01:00.000Z",
      custodyChain: [approved, mailed],
      metadata: { workflowId: "cp14-response" },
    });
    expect(verifyProofBundle(proof)).toBe(true);

    const archive = createMatterArchiveManifest({
      matterId: "cp14-case-1",
      workflowId: "cp14-response",
      finalDocumentSha256: hashDraft(draftContent),
      artifactIds: ["doc-cp14-packet", "lob-letter-cp14-1"],
      proofBundleSha256: proof.bundleSha256,
      completedAt: "2026-09-17T07:02:00.000Z",
      createdAt: "2026-09-17T07:02:00.000Z",
    });
    expect(verifyMatterArchiveManifest(archive)).toBe(true);
  });

  it("fails closed when the approved response changes before fulfillment", async () => {
    const recipient = { name: "Internal Revenue Service", address1: "100 Notice Response Way", city: "Fresno", state: "CA", zip: "93725" };
    const approvedDraft = "Original approved CP14 response";
    const now = new Date().toISOString();
    const store = new MemoryIntentStore({
      id: "cp14-intent-tamper",
      owner_id: "acceptance-user",
      workflow_id: "cp14-response",
      draft_content: `${approvedDraft} -- mutated`,
      recipient,
      mailing_method: "certified",
      approved_draft_hash: hashDraft(approvedDraft),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_cp14_tamper",
      status: "approved",
      created_at: now,
      updated_at: now,
    });

    let submitted = false;
    const client: MailMyPDFClient = {
      async uploadDocument() { submitted = true; return { id: "should-not-upload" }; },
      async createCommunication() { submitted = true; return { id: "should-not-mail" }; },
    };

    const result = await fulfillMailingIntent(store, client, store.intent.id, "cs_test_cp14_tamper", null, "stripe-webhook", "notice-respond");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(submitted).toBe(false);
  });
});
