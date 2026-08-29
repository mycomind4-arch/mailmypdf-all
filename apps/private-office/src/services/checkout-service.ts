/**
 * Checkout service — creates Stripe Checkout Sessions with
 * server-authoritative pricing from the canonical @mailmypdf/pricing engine.
 *
 * SECURITY:
 * - Pricing is derived from the canonical pricing profile, not client input.
 * - Matter ownership is verified server-side.
 * - Stripe metadata binds the payment to the exact matter and owner.
 */

import { z } from "zod";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  serializeQuote,
  LABELS,
  type MailClass,
} from "@mailmypdf/pricing";
import type { WorkflowId } from "@/domain/workflows";
import type { StripeAdapter } from "@/platform/stripe-adapter";
import type { PaymentEvidenceRepository } from "@/domain/payment-evidence";
import type { MatterRepository } from "@/domain/matter-repository";

export const checkoutInputSchema = z.object({
  workflowId: z.string().min(1),
  matterId: z.string().min(1),
  mailingMethod: z.enum(["standard", "certified", "registered"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Compute server-authoritative price from the canonical pricing engine.
 * Returns the amount in cents (Stripe's unit).
 */
export function computeCheckoutAmount(
  workflowId: string,
  mailingMethod: "standard" | "certified" | "registered",
  actualPages: number = 3,
): { amount: number; currency: string; quoteSnapshot: string | null } {
  const profile = getWorkflowPricingProfile(workflowId);
  if (!profile)
    throw new Error(`Unknown workflow: ${workflowId}`);

  if (profile.commercialStatus !== "production")
    throw new Error(`Workflow ${workflowId} is not available for purchase (status: ${profile.commercialStatus}).`);

  const mailClass = mailingMethod as MailClass;
  const quote = calculateQuote({
    workflowId,
    verticalId: profile.verticalId,
    actualPages,
    mailClass,
  });

  return {
    amount: quote.totalCents,
    currency: "usd",
    quoteSnapshot: serializeQuote(quote),
  };
}

/**
 * Create a Stripe Checkout Session with server-authoritative pricing.
 */
export async function createCheckoutSessionInternal(
  ownerId: string,
  input: CheckoutInput,
  dependencies: {
    stripeAdapter: StripeAdapter;
    paymentEvidenceRepository: PaymentEvidenceRepository;
    matterRepository: MatterRepository;
  },
): Promise<CheckoutResult> {
  const validated = checkoutInputSchema.parse(input);
  const workflowId = validated.workflowId as WorkflowId;

  const { stripeAdapter, paymentEvidenceRepository, matterRepository } = dependencies;

  // Verify matter ownership server-side
  const matter = await matterRepository.get(ownerId, validated.matterId);
  if (!matter)
    throw new Error("Matter not found or not accessible for this owner.");

  // Verify the matter belongs to the correct workflow
  if (matter.workflowId !== workflowId)
    throw new Error("Matter does not belong to the specified workflow.");

  // Compute server-authoritative pricing from canonical engine
  const { amount, currency, quoteSnapshot } = computeCheckoutAmount(
    workflowId,
    validated.mailingMethod,
  );

  const profile = getWorkflowPricingProfile(workflowId);
  const workflowTitle = profile?.workflowId ?? workflowId;

  // Create Stripe checkout session with metadata binding
  const session = await stripeAdapter.createCheckoutSession({
    amount,
    currency,
    successUrl: validated.successUrl,
    cancelUrl: validated.cancelUrl,
    metadata: {
      matterId: validated.matterId,
      ownerId,
      workflowId: validated.workflowId,
      quoteTotalCents: String(amount),
      pricingSource: "canonical",
      quoteSnapshot: quoteSnapshot ?? "",
    },
    description: `Private Office — ${workflowTitle} (${validated.mailingMethod} mail)`,
  });

  // Create pending PaymentEvidence
  await paymentEvidenceRepository.create({
    ownerId,
    matterId: validated.matterId,
    workflowId,
    stripeSessionId: session.sessionId,
    stripePaymentIntentId: session.paymentIntentId ?? "",
    amount,
    currency,
  });

  return { checkoutUrl: session.sessionUrl, sessionId: session.sessionId };
}
