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
import cp2000Manifest from "../../../workflows/cp2000-response/manifest";
import {
  noticeRespondRuntimePolicyFor,
  noticeRespondStartRouteFor,
} from "../../../runtime";

class MemoryIntentStore implements MailingIntentStore {
  constructor(public intent: MailingIntent) {}
  async load(intentId: string): Promise<MailingIntent | null> {
    return this.intent.id === intentId ? this.intent : null;
  }
  async loadByStripeSession(sessionId: string): Promise<MailingIntent | null> {
    return this.intent.stripe_session_id === sessionId ? this.intent : null;
  }
  async updateStatus(
    intentId: string,
    update: Partial<MailingIntent>,
  ): Promise<void> {
    if (intentId !== this.intent.id) throw new Error("unknown mailing intent");
    this.intent = {
      ...this.intent,
      ...update,
      updated_at: new Date().toISOString(),
    };
  }
}

describe("CP2000 response production acceptance", () => {
  it("is fully registered and fulfills exactly once with verifiable proof", async () => {
    expect(cp2000Manifest.id).toBe("cp2000-response");
    expect(cp2000Manifest.route).toBe(
      "/notice-respond/workflows/cp2000-response/start",
    );
    expect(noticeRespondRuntimePolicyFor("cp2000-response")).not.toBeNull();
    expect(noticeRespondStartRouteFor("cp2000-response")?.path).toBe(
      "/notice-respond/workflows/cp2000-response/start/",
    );

    const draftContent = [
      "Response to IRS CP2000 Notice",
      "I am responding to the proposed changes identified in the controlling notice.",
      "The enclosed records support the confirmed facts stated in this response.",
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
      id: "cp2000-intent-1",
      owner_id: "acceptance-user",
      workflow_id: "cp2000-response",
      case_id: "cp2000-case-1",
      approval_id: "cp2000-approval-1",
      draft_content: draftContent,
      recipient,
      mailing_method: "certified",
      matter_reference: "IRS CP2000 response",
      matter_type: "notice-respond",
      approved_draft_hash: hashDraft(draftContent),
      approved_recipient_hash: hashRecipient(recipient),
      stripe_session_id: "cs_test_cp2000_1",
      stripe_price_cents: 1494,
      status: "approved",
      created_at: now,
      updated_at: now,
    };

    const store = new MemoryIntentStore(intent);
    let providerSubmissions = 0;
    const client: MailMyPDFClient = {
      async uploadDocument() {
        return { id: "doc-cp2000-packet" };
      },
      async createCommunication(params) {
        providerSubmissions += 1;
        expect(params.idempotency_key).toBe("stripe:cs_test_cp2000_1");
        expect(params.mail_type).toBe("certified");
        return {
          id: "lob-letter-cp2000-1",
          tracking_number: "9400111899223856928025",
          status: "submitted",
        };
      },
    };

    const first = await fulfillMailingIntent(
      store,
      client,
      intent.id,
      "cs_test_cp2000_1",
      "pi_test_cp2000_1",
      "stripe-webhook",
      "notice-respond",
    );
    expect(first.success).toBe(true);
    expect(providerSubmissions).toBe(1);

    const second = await fulfillMailingIntent(
      store,
      client,
      intent.id,
      "cs_test_cp2000_1",
      "pi_test_cp2000_1",
      "browser-return",
      "notice-respond",
    );
    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(providerSubmissions).toBe(1);

    const approved = createCustodyEvent({
      priorEventHash: null,
      timestamp: "2026-09-18T00:00:00.000Z",
      eventType: "packet.approved",
      description: "User approved the exact CP2000 response packet.",
      metadata: { workflowId: "cp2000-response" },
    });
    const mailed = createCustodyEvent({
      priorEventHash: approved.eventHash,
      timestamp: "2026-09-18T00:01:00.000Z",
      eventType: "mail.submitted",
      description: "Approved CP2000 packet submitted to mailing provider.",
      metadata: { providerOrderId: "lob-letter-cp2000-1" },
    });
    const proof = createVerifiableProofBundle({
      subjectId: intent.id,
      documentSha256: hashDraft(draftContent),
      mailingId: "lob-letter-cp2000-1",
      trackingNumber: "9400111899223856928025",
      sentAt: "2026-09-18T00:01:00.000Z",
      custodyChain: [approved, mailed],
      metadata: { workflowId: "cp2000-response" },
    });
    expect(verifyProofBundle(proof)).toBe(true);

    const archive = createMatterArchiveManifest({
      matterId: "cp2000-case-1",
      workflowId: "cp2000-response",
      finalDocumentSha256: hashDraft(draftContent),
      artifactIds: ["doc-cp2000-packet", "lob-letter-cp2000-1"],
      proofBundleSha256: proof.bundleSha256,
      completedAt: "2026-09-18T00:02:00.000Z",
      createdAt: "2026-09-18T00:02:00.000Z",
    });
    expect(verifyMatterArchiveManifest(archive)).toBe(true);
  });
});
