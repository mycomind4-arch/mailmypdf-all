import { canAuthorizeDisputeMail, type DisputeAnalysis } from "@/domain/gold-standard";
import type { MailingMethod, MailingRecipient } from "@/domain/mailing";
import { mailMyPDFProvider } from "@/platform/mailmypdf-provider";

export interface ApprovedDisputeSubmissionInput {
  workflowId: string;
  documentId: string;
  analysis: DisputeAnalysis;
  draftValidated: boolean;
  humanApproved: boolean;
  recipient: MailingRecipient;
  paymentComplete: boolean;
  stripePaymentId: string;
  mailingMethod: MailingMethod;
  proofReady: boolean;
  idempotencyKey: string;
  matterReference?: string;
}

export async function submitApprovedDispute(input: ApprovedDisputeSubmissionInput) {
  const recipientComplete = Boolean(input.recipient.name && input.recipient.address1 && input.recipient.city && input.recipient.state && input.recipient.postalCode);
  if (!canAuthorizeDisputeMail({ analysis: input.analysis, draftValidated: input.draftValidated, humanApproved: input.humanApproved, recipientComplete, paymentComplete: input.paymentComplete })) {
    throw new Error("Dispute cannot be submitted: validation, evidence, approval, recipient, or payment prerequisites are incomplete");
  }
  if (!input.stripePaymentId.trim()) throw new Error("Dispute mailing requires a verified Stripe payment identifier");
  if (!input.idempotencyKey.trim()) throw new Error("Dispute mailing requires an idempotency key");

  const { providerOrderId } = await mailMyPDFProvider.createLetter({
    workflowId: input.workflowId,
    documentId: input.documentId,
    recipient: input.recipient,
    method: input.mailingMethod,
    stripePaymentId: input.stripePaymentId,
    idempotencyKey: input.idempotencyKey,
    matterReference: input.matterReference ?? input.workflowId,
    matterType: "dispute-mail",
  });

  const status = await mailMyPDFProvider.getStatus(providerOrderId);
  return { providerOrderId, status };
}
