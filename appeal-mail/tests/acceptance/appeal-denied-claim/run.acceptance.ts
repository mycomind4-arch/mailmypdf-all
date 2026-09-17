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

describe("Appeal denied claim production acceptance", () => {
  it("builds a mail-ready appeal, fulfills exactly once, and produces verifiable proof", async () => {
    const draftContent = [
      "Appeal of Denied Claim",
      "I request review and reversal of the denial described in the source letter.",
      "The enclosed evidence supports the requested outcome.",
    ].join("\n\n");
    const packetBytes = await generatePlainTextPdf(draftContent);
    expect(packetBytes.byteLength).toBeGreaterThan(500);

    const recipient = {
      name: "Claims Appeals Department",
      address1: "100 Review Way",
      city: "Sacramento",
      state: "CA",
      zip: "95814",
    };
    const now = new Date().toISOString();
    const intent: MailingIntent = {
      id: "denied-claim-intent-1",
      owner_id: "acceptance-user",
      workflow_id: "appeal-denied-claim",
      case_id: "denied-claim-case-1",
      approval_id: "denied-claim-approval-1",
      draft_content: draftContent,
      recipient,
      mailing_method: "certified",
      matter_reference: "Denied claim appeal",
      matter_type: "appeal-mail",
      approved_draft_hash: hashDraft(draftContent),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_denied_claim_1",
      stripe_price_cents: 1494,
      status: "approved",
      created_at: now,
      updated_at: now,
    };

    const store = new MemoryIntentStore(intent);
    let providerSubmissions = 0;
    const client: MailMyPDFClient = {
      async uploadDocument() { return { id: "doc-denied-claim-packet" }; },
      async createCommunication(params) {
        providerSubmissions += 1;
        expect(params.idempotency_key).toBe("stripe:cs_test_denied_claim_1");
        expect(params.mail_type).toBe("certified");
        return { id: "lob-letter-denied-claim-1", tracking_number: "9400111899223856928001", status: "submitted" };
      },
    };

    const first = await fulfillMailingIntent(store, client, intent.id, "cs_test_denied_claim_1", "pi_test_denied_claim_1", "stripe-webhook", "appeal-mail");
    expect(first.success).toBe(true);
    expect(providerSubmissions).toBe(1);

    const second = await fulfillMailingIntent(store, client, intent.id, "cs_test_denied_claim_1", "pi_test_denied_claim_1", "browser-return", "appeal-mail");
    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(providerSubmissions).toBe(1);

    const approved = createCustodyEvent({
      priorEventHash: null,
      timestamp: "2026-09-16T12:00:00.000Z",
      eventType: "packet.approved",
      description: "User approved the exact denied-claim appeal packet.",
      metadata: { workflowId: "appeal-denied-claim" },
    });
    const mailed = createCustodyEvent({
      priorEventHash: approved.eventHash,
      timestamp: "2026-09-16T12:01:00.000Z",
      eventType: "mail.submitted",
      description: "Approved appeal packet submitted to mailing provider.",
      metadata: { providerOrderId: "lob-letter-denied-claim-1" },
    });
    const proof = createVerifiableProofBundle({
      subjectId: intent.id,
      documentSha256: hashDraft(draftContent),
      mailingId: "lob-letter-denied-claim-1",
      trackingNumber: "9400111899223856928001",
      sentAt: "2026-09-16T12:01:00.000Z",
      custodyChain: [approved, mailed],
      metadata: { workflowId: "appeal-denied-claim" },
    });
    expect(verifyProofBundle(proof)).toBe(true);

    const archive = createMatterArchiveManifest({
      matterId: "denied-claim-case-1",
      workflowId: "appeal-denied-claim",
      finalDocumentSha256: hashDraft(draftContent),
      artifactIds: ["doc-denied-claim-packet", "lob-letter-denied-claim-1"],
      proofBundleSha256: proof.bundleSha256,
      completedAt: "2026-09-16T12:02:00.000Z",
      createdAt: "2026-09-16T12:02:00.000Z",
    });
    expect(verifyMatterArchiveManifest(archive)).toBe(true);
  });

  it("fails closed when the approved draft changes before fulfillment", async () => {
    const recipient = { name: "Claims Appeals Department", address1: "100 Review Way", city: "Sacramento", state: "CA", zip: "95814" };
    const approvedDraft = "Original approved denied-claim appeal";
    const now = new Date().toISOString();
    const store = new MemoryIntentStore({
      id: "denied-claim-intent-tamper",
      owner_id: "acceptance-user",
      workflow_id: "appeal-denied-claim",
      draft_content: `${approvedDraft} -- mutated`,
      recipient,
      mailing_method: "certified",
      approved_draft_hash: hashDraft(approvedDraft),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_denied_claim_tamper",
      status: "approved",
      created_at: now,
      updated_at: now,
    });

    let submitted = false;
    const client: MailMyPDFClient = {
      async uploadDocument() { submitted = true; return { id: "should-not-upload" }; },
      async createCommunication() { submitted = true; return { id: "should-not-mail" }; },
    };

    const result = await fulfillMailingIntent(store, client, store.intent.id, "cs_test_denied_claim_tamper", null, "stripe-webhook", "appeal-mail");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(submitted).toBe(false);
  });
});
