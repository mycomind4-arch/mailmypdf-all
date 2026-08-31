import { canAuthorizeMatterMail, type MatterAnalysis } from "@/domain/gold-standard";
import { isApprovalValid } from "@/domain/draft-provenance";
import type { MailingMethod, MailingRecipient } from "@/domain/mailing";
import { mailMyPDFProvider } from "@/platform/mailmypdf-provider";
import {
  type ClaimMailingIntentInput,
  type MailingIntentRepository,
} from "@/domain/mailing-intent-repository";
import { supabaseMailingIntentRepository } from "@/services/supabase-mailing-intent-repository";

export interface ApprovedMatterSubmissionInput {
  /** Authenticated owner — derived server-side, never from client request body. */
  ownerId: string;
  workflowId: string;
  documentId: string;
  analysis: MatterAnalysis;
  draftValidated: boolean;
  humanApproved: boolean;
  recipient: MailingRecipient;
  /**
   * Server-verified payment status. Must be set to true only by a server
   * function that has confirmed the payment with the Stripe API.
   * This is distinct from the client-claimed `paymentComplete` in the
   * workflow executor's consequential state.
   */
  paymentVerified: boolean;
  stripePaymentId: string;
  mailingMethod: MailingMethod;
  proofReady: boolean;
  idempotencyKey: string;
  matterReference?: string;
  /** The draft text content being submitted. */
  draftContent: string;
  /** Hash of the draft content currently being submitted. */
  currentDraftHash: string;
  /** Hash of the draft content that was approved. */
  approvedDraftHash: string;
  /** Optional matter ID for linking the mailing intent. */
  matterId?: string;
}

/**
 * Fulfillment service for approved Private Office matters.
 *
 * Uses a durable mailing-intent outbox (Supabase private_office_mailing_intents)
 * as the authoritative idempotency mechanism. Before calling the MailMyPDF
 * provider, a pending intent row is claimed. If a submitted intent already
 * exists for the same (idempotency_key, owner_id), the cached result is
 * returned without calling the provider.
 *
 * This replaces the previous in-process Map, which did not survive restarts,
 * did not work across server instances, and had a TOCTOU race.
 *
 * The intent repository is injectable for testing. In production, the
 * SupabaseMailingIntentRepository singleton is used by default.
 */
export async function submitApprovedMatter(
  input: ApprovedMatterSubmissionInput,
  repository: MailingIntentRepository = supabaseMailingIntentRepository,
) {
  // --- Gate 1: Idempotency — claim a durable intent slot ---
  const claimInput: ClaimMailingIntentInput = {
    ownerId: input.ownerId,
    idempotencyKey: input.idempotencyKey,
    workflowId: input.workflowId,
    matterId: input.matterId,
    mailingMethod: input.mailingMethod,
    draftContent: input.draftContent,
    draftHash: input.currentDraftHash,
    recipient: input.recipient,
    matterReference: input.matterReference,
    matterType: "private-office",
    stripePaymentId: input.stripePaymentId,
  };

  const { intent, isNew } = await repository.claim(claimInput);

  if (!isNew) {
    // Already submitted — return cached result (idempotent)
    return {
      providerOrderId: intent.providerOrderId!,
      status: { state: "submitted" as const, updatedAt: intent.updatedAt },
    };
  }

  // --- Gate 2: Draft version integrity ---
  if (!isApprovalValid(input.currentDraftHash, input.approvedDraftHash)) {
    await repository.markFailed(
      input.idempotencyKey,
      input.ownerId,
      "Draft was modified after approval.",
    );
    throw new Error(
      "Draft was modified after approval. The draft must be reviewed and approved again before mailing.",
    );
  }

  // --- Gate 3: Payment verification (server-verified, before composite check) ---
  if (!input.paymentVerified) {
    await repository.markFailed(
      input.idempotencyKey,
      input.ownerId,
      "Payment not server-verified.",
    );
    throw new Error("Matter mailing requires server-verified payment");
  }
  if (!input.stripePaymentId.trim()) {
    await repository.markFailed(
      input.idempotencyKey,
      input.ownerId,
      "Missing Stripe payment identifier.",
    );
    throw new Error("Matter mailing requires a verified Stripe payment identifier");
  }
  if (!input.idempotencyKey.trim())
    throw new Error("Matter mailing requires an idempotency key");

  // --- Gate 4: Recipient completeness ---
  const recipientComplete = Boolean(
    input.recipient.name &&
      input.recipient.address1 &&
      input.recipient.city &&
      input.recipient.state &&
      input.recipient.postalCode,
  );

  // --- Gate 5: Authorization (analysis + draft + approval + recipient) ---
  // Payment is already verified in Gate 3, so pass paymentComplete: true.
  if (
    !canAuthorizeMatterMail({
      analysis: input.analysis,
      draftValidated: input.draftValidated,
      humanApproved: input.humanApproved,
      recipientComplete,
      paymentComplete: true,
    })
  ) {
    await repository.markFailed(
      input.idempotencyKey,
      input.ownerId,
      "Authorization prerequisites incomplete.",
    );
    throw new Error(
      "Matter cannot be submitted: validation, evidence, approval, or recipient prerequisites are incomplete",
    );
  }

  // --- Gate 6: Provider submission ---
  try {
    const { providerOrderId } = await mailMyPDFProvider.createLetter({
      workflowId: input.workflowId,
      documentId: input.documentId,
      recipient: input.recipient,
      method: input.mailingMethod,
      stripePaymentId: input.stripePaymentId,
      idempotencyKey: input.idempotencyKey,
      matterReference: input.matterReference ?? input.workflowId,
      matterType: "private-office",
    });

    const status = await mailMyPDFProvider.getStatus(providerOrderId);

    // Record success in the durable outbox
    await repository.markSubmitted(
      input.idempotencyKey,
      input.ownerId,
      providerOrderId,
      status.trackingNumber,
    );

    return { providerOrderId, status };
  } catch (error) {
    // Record failure so the intent can be retried
    const message = error instanceof Error ? error.message : "Unknown provider error";
    await repository.markFailed(input.idempotencyKey, input.ownerId, message);
    throw error;
  }
}
