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
  createVerifiableProofBundle,
  verifyProofBundle,
} from "@mailmypdf/proof";
import carInsuranceClaimManifest from "../../../workflows/appeal-car-insurance-claim/manifest";
import timelyFilingDenialManifest from "../../../workflows/appeal-timely-filing-denial/manifest";
import { appealMailRuntimePolicyFor, appealMailStartRouteFor } from "../../../runtime";

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

const variants = [
  {
    id: "appeal-car-insurance-claim",
    manifest: carInsuranceClaimManifest,
    label: "Car insurance claim appeal",
  },
  {
    id: "appeal-timely-filing-denial",
    manifest: timelyFilingDenialManifest,
    label: "Timely filing denial appeal",
  },
] as const;

describe("new insurance appeal variants production acceptance", () => {
  for (const variant of variants) {
    it(`${variant.id} composes, fulfills exactly once, and produces verifiable proof`, async () => {
      expect(variant.manifest.manifest.id).toBe(variant.id);
      expect(appealMailRuntimePolicyFor(variant.id)).not.toBeNull();
      expect(appealMailStartRouteFor(variant.id)?.path).toBe(
        `/appeal-mail/workflows/${variant.id}/start/`,
      );

      const draftContent = [
        variant.label,
        "I request review of the decision described in the source record.",
        "Please consider the confirmed facts and enclosed supporting evidence.",
      ].join("\n\n");
      const packetBytes = await generatePlainTextPdf(draftContent);
      expect(packetBytes.byteLength).toBeGreaterThan(500);

      const recipient = {
        name: "Insurance Review Department",
        address1: "100 Review Way",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      };
      const now = new Date().toISOString();
      const intent: MailingIntent = {
        id: `${variant.id}-intent`,
        owner_id: "acceptance-user",
        workflow_id: variant.id,
        case_id: `${variant.id}-case`,
        approval_id: `${variant.id}-approval`,
        draft_content: draftContent,
        recipient,
        mailing_method: "certified",
        matter_reference: variant.label,
        matter_type: "appeal-mail",
        approved_draft_hash: hashDraft(draftContent),
        approved_recipient_hash: hashRecipient(recipient),
        stripe_session_id: `cs_test_${variant.id}`,
        stripe_price_cents: 1494,
        status: "approved",
        created_at: now,
        updated_at: now,
      };

      const store = new MemoryIntentStore(intent);
      let providerSubmissions = 0;
      const client: MailMyPDFClient = {
        async uploadDocument() {
          return { id: `doc-${variant.id}` };
        },
        async createCommunication(params) {
          providerSubmissions += 1;
          expect(params.idempotency_key).toBe(`stripe:cs_test_${variant.id}`);
          expect(params.mail_type).toBe("certified");
          return {
            id: `lob-letter-${variant.id}`,
            tracking_number: "9400111899223856928001",
            status: "submitted",
          };
        },
      };

      const first = await fulfillMailingIntent(
        store,
        client,
        intent.id,
        `cs_test_${variant.id}`,
        `pi_test_${variant.id}`,
        "stripe-webhook",
        "appeal-mail",
      );
      expect(first.success).toBe(true);
      expect(providerSubmissions).toBe(1);

      const second = await fulfillMailingIntent(
        store,
        client,
        intent.id,
        `cs_test_${variant.id}`,
        `pi_test_${variant.id}`,
        "browser-return",
        "appeal-mail",
      );
      expect(second.success).toBe(true);
      expect(second.idempotent).toBe(true);
      expect(providerSubmissions).toBe(1);

      const approved = createCustodyEvent({
        priorEventHash: null,
        timestamp: "2026-09-17T12:00:00.000Z",
        eventType: "packet.approved",
        description: "User approved the exact insurance appeal packet.",
        metadata: { workflowId: variant.id },
      });
      const mailed = createCustodyEvent({
        priorEventHash: approved.eventHash,
        timestamp: "2026-09-17T12:01:00.000Z",
        eventType: "mail.submitted",
        description: "Approved appeal packet submitted to the mailing provider.",
        metadata: { providerOrderId: `lob-letter-${variant.id}` },
      });
      const proof = createVerifiableProofBundle({
        subjectId: intent.id,
        documentSha256: hashDraft(draftContent),
        mailingId: `lob-letter-${variant.id}`,
        trackingNumber: "9400111899223856928001",
        sentAt: "2026-09-17T12:01:00.000Z",
        custodyChain: [approved, mailed],
        metadata: { workflowId: variant.id },
      });
      expect(verifyProofBundle(proof)).toBe(true);
    });
  }
});
