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

describe("Immigration filing cover letter production acceptance", () => {
  it("builds a filing cover letter, fulfills once, and produces verifiable proof", async () => {
    const draftContent = [
      "RE: Immigration Filing Packet",
      "Please find enclosed the filing identified in the reviewed matter details.",
      "The enclosed documents are listed and submitted with this packet.",
    ].join("\n\n");
    const packetBytes = await generatePlainTextPdf(draftContent);
    expect(packetBytes.byteLength).toBeGreaterThan(500);

    const recipient = {
      name: "U.S. Citizenship and Immigration Services",
      address1: "2500 Filing Center Dr",
      city: "Chicago",
      state: "IL",
      zip: "60603",
    };
    const now = new Date().toISOString();
    const intent: MailingIntent = {
      id: "immigration-cover-letter-intent-1",
      owner_id: "acceptance-user",
      workflow_id: "immigration-filing-cover-letter",
      case_id: "immigration-cover-letter-case-1",
      approval_id: "immigration-cover-letter-approval-1",
      draft_content: draftContent,
      recipient,
      mailing_method: "certified",
      matter_reference: "Immigration filing cover letter",
      matter_type: "immigration-mail",
      approved_draft_hash: hashDraft(draftContent),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_immigration_cover_letter_1",
      stripe_price_cents: 1494,
      status: "approved",
      created_at: now,
      updated_at: now,
    };

    const store = new MemoryIntentStore(intent);
    let providerSubmissions = 0;
    const client: MailMyPDFClient = {
      async uploadDocument() { return { id: "doc-immigration-cover-letter-packet" }; },
      async createCommunication(params) {
        providerSubmissions += 1;
        expect(params.idempotency_key).toBe("stripe:cs_test_immigration_cover_letter_1");
        expect(params.mail_type).toBe("certified");
        return { id: "lob-letter-immigration-cover-letter-1", tracking_number: "9400111899223856928117", status: "submitted" };
      },
    };

    const first = await fulfillMailingIntent(store, client, intent.id, "cs_test_immigration_cover_letter_1", "pi_test_immigration_cover_letter_1", "stripe-webhook", "immigration-mail");
    expect(first.success).toBe(true);
    expect(providerSubmissions).toBe(1);

    const second = await fulfillMailingIntent(store, client, intent.id, "cs_test_immigration_cover_letter_1", "pi_test_immigration_cover_letter_1", "browser-return", "immigration-mail");
    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(providerSubmissions).toBe(1);

    const approved = createCustodyEvent({
      priorEventHash: null,
      timestamp: "2026-09-17T10:00:00.000Z",
      eventType: "packet.approved",
      description: "User approved the exact immigration filing packet.",
      metadata: { workflowId: "immigration-filing-cover-letter" },
    });
    const mailed = createCustodyEvent({
      priorEventHash: approved.eventHash,
      timestamp: "2026-09-17T10:01:00.000Z",
      eventType: "mail.submitted",
      description: "Approved immigration filing packet submitted to mailing provider.",
      metadata: { providerOrderId: "lob-letter-immigration-cover-letter-1" },
    });
    const proof = createVerifiableProofBundle({
      subjectId: intent.id,
      documentSha256: hashDraft(draftContent),
      mailingId: "lob-letter-immigration-cover-letter-1",
      trackingNumber: "9400111899223856928117",
      sentAt: "2026-09-17T10:01:00.000Z",
      custodyChain: [approved, mailed],
      metadata: { workflowId: "immigration-filing-cover-letter" },
    });
    expect(verifyProofBundle(proof)).toBe(true);

    const archive = createMatterArchiveManifest({
      matterId: "immigration-cover-letter-case-1",
      workflowId: "immigration-filing-cover-letter",
      finalDocumentSha256: hashDraft(draftContent),
      artifactIds: ["doc-immigration-cover-letter-packet", "lob-letter-immigration-cover-letter-1"],
      proofBundleSha256: proof.bundleSha256,
      completedAt: "2026-09-17T10:02:00.000Z",
      createdAt: "2026-09-17T10:02:00.000Z",
    });
    expect(verifyMatterArchiveManifest(archive)).toBe(true);
  });

  it("fails closed when approved content changes before fulfillment", async () => {
    const recipient = { name: "USCIS", address1: "2500 Filing Center Dr", city: "Chicago", state: "IL", zip: "60603" };
    const approvedDraft = "Original approved immigration filing cover letter";
    const now = new Date().toISOString();
    const store = new MemoryIntentStore({
      id: "immigration-cover-letter-intent-tamper",
      owner_id: "acceptance-user",
      workflow_id: "immigration-filing-cover-letter",
      draft_content: `${approvedDraft} -- mutated`,
      recipient,
      mailing_method: "certified",
      approved_draft_hash: hashDraft(approvedDraft),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_immigration_cover_letter_tamper",
      status: "approved",
      created_at: now,
      updated_at: now,
    });

    let submitted = false;
    const client: MailMyPDFClient = {
      async uploadDocument() { submitted = true; return { id: "should-not-upload" }; },
      async createCommunication() { submitted = true; return { id: "should-not-mail" }; },
    };

    const result = await fulfillMailingIntent(store, client, store.intent.id, "cs_test_immigration_cover_letter_tamper", null, "stripe-webhook", "immigration-mail");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Integrity check failed");
    expect(submitted).toBe(false);
  });
});
