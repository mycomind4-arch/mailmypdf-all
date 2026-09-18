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
import {
  recordRecordsRequestSentFromFulfillment,
  type WorkflowRuntimeStoredEvent,
} from "@mailmypdf/workflows";
import agencyRecordsRequestManifest from "../../../workflows/agency-records-request/manifest";
import publicRecordsRequestManifest from "../../../workflows/public-records-request/manifest";
import openRecordsRequestManifest from "../../../workflows/open-records-request/manifest";
import governmentDocumentsRequestManifest from "../../../workflows/government-documents-request/manifest";
import {
  recordsRequestRuntimePolicyFor,
  recordsRequestStartRouteFor,
} from "../../../runtime";

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
    id: "agency-records-request",
    manifest: agencyRecordsRequestManifest,
    label: "Agency Records Request",
  },
  {
    id: "public-records-request",
    manifest: publicRecordsRequestManifest,
    label: "Public Records Request",
  },
  {
    id: "open-records-request",
    manifest: openRecordsRequestManifest,
    label: "Open Records Request",
  },
  {
    id: "government-documents-request",
    manifest: governmentDocumentsRequestManifest,
    label: "Government Documents Request",
  },
] as const;

describe("records request factory acceptance", () => {
  for (const variant of variants) {
    it(`${variant.id} runs through mailing proof and response tracking`, async () => {
      expect(variant.manifest.manifest.id).toBe(variant.id);
      expect(recordsRequestStartRouteFor(variant.id)).not.toBeNull();
      const policy = recordsRequestRuntimePolicyFor(variant.id);
      expect(policy).not.toBeNull();
      expect(policy?.requiresSourceDocument).toBe(false);

      const draftContent = [
        variant.label,
        "Please provide the identifiable public records described in this request.",
        "Please send responsive records in the requested format where available.",
      ].join("\n\n");
      const packetBytes = await generatePlainTextPdf(draftContent);
      expect(packetBytes.byteLength).toBeGreaterThan(500);

      const recipient = {
        name: "Records Custodian",
        address1: "100 Agency Way",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      };
      const now = "2026-09-17T20:00:00.000Z";
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
        matter_type: "records-request",
        approved_draft_hash: hashDraft(draftContent),
        approved_recipient_hash: hashRecipient(recipient),
        stripe_session_id: `cs_test_${variant.id}`,
        stripe_price_cents: 1494,
        status: "approved",
        created_at: now,
        updated_at: now,
      };

      const store = new MemoryIntentStore(intent);
      let submissions = 0;
      const client: MailMyPDFClient = {
        async uploadDocument() {
          return { id: `doc-${variant.id}` };
        },
        async createCommunication(params) {
          submissions += 1;
          expect(params.idempotency_key).toBe(`stripe:cs_test_${variant.id}`);
          return {
            id: `lob-${variant.id}`,
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
        "records-request",
      );
      expect(first.success).toBe(true);
      expect(submissions).toBe(1);

      const retry = await fulfillMailingIntent(
        store,
        client,
        intent.id,
        `cs_test_${variant.id}`,
        `pi_test_${variant.id}`,
        "browser-return",
        "records-request",
      );
      expect(retry.success).toBe(true);
      expect(retry.idempotent).toBe(true);
      expect(submissions).toBe(1);

      const sentResult = recordRecordsRequestSentFromFulfillment({
        mailingClass: "certified",
        event: {
          providerOrderId: `lob-${variant.id}`,
          status: "mailed",
          occurredAt: "2026-09-18T00:05:00.000Z",
          actualSentAt: "2026-09-17T23:55:00.000Z",
          trackingNumber: "9400111899223856928001",
          proofArtifactId: `proof-${variant.id}`,
        },
      });
      expect(sentResult.ok).toBe(true);
      expect(sentResult.event?.type).toBe("records_request_sent");

      const sentEvent: WorkflowRuntimeStoredEvent = {
        id: `sent-${variant.id}`,
        type: sentResult.event!.type,
        occurredOn: sentResult.event!.occurredOn,
        data: sentResult.event!.data,
        createdAt: "2026-09-18T00:05:00.000Z",
        source: "provider",
      };
      const response = policy!.validateUserEvent?.({
        event: {
          responded: true,
          responseDate: "2026-09-24",
          note: "Agency response received.",
        },
        matter: {
          matter: {
            id: `${variant.id}-case`,
            workflowId: variant.id,
            verticalId: "records-request",
            status: "active",
            createdAt: now,
            updatedAt: now,
          },
          documents: [],
        },
        existingEvents: [sentEvent],
      });
      expect(response?.type).toBe("records_response_received");

      const approved = createCustodyEvent({
        priorEventHash: null,
        timestamp: "2026-09-17T23:50:00.000Z",
        eventType: "packet.approved",
        description: "User approved exact records request packet.",
        metadata: { workflowId: variant.id },
      });
      const mailed = createCustodyEvent({
        priorEventHash: approved.eventHash,
        timestamp: "2026-09-17T23:55:00.000Z",
        eventType: "mail.submitted",
        description: "Approved records request submitted to mailing provider.",
        metadata: { providerOrderId: `lob-${variant.id}` },
      });
      const proof = createVerifiableProofBundle({
        subjectId: intent.id,
        documentSha256: hashDraft(draftContent),
        mailingId: `lob-${variant.id}`,
        trackingNumber: "9400111899223856928001",
        sentAt: "2026-09-17T23:55:00.000Z",
        custodyChain: [approved, mailed],
        metadata: { workflowId: variant.id },
      });
      expect(verifyProofBundle(proof)).toBe(true);
    });
  }
});
