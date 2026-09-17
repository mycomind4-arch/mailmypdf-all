import {
  calculateQuote,
  getWorkflowPricingProfile,
  getWorkflowPricingProfileOrThrow,
  type Quote,
  type QuoteInput,
  type WorkflowPricingProfile,
} from "./index.js";

/**
 * Compatibility aliases for workflows migrated into the new top-level
 * architecture. New workflow code should use only the canonical id; this layer
 * is the sole place that knows the retired pricing-catalog identifier.
 */
export const CANONICAL_WORKFLOW_PRICING_ALIASES: Readonly<Record<string, string>> = {
  "appeal-ssdi-denial": "ssdi-denial",
  "appeal-denied-claim": "denied-claim",
  "appeal-insurance-claim-denial": "insurance-claim-denial",
  "appeal-insurance-coverage-denial": "insurance-coverage-denial",
  "appeal-medical-insurance-denial": "medical-insurance-denial",
  "appeal-medical-necessity-denial": "medical-necessity-appeal",
  "appeal-prior-authorization-denial": "prior-authorization-denial",
  "appeal-out-of-network-denial": "out-of-network-denial",
  "appeal-dental-insurance-denial": "dental-insurance-appeal",
  "appeal-life-insurance-denial": "life-insurance-denial",
};

export function pricingCatalogWorkflowId(workflowId: string): string {
  return CANONICAL_WORKFLOW_PRICING_ALIASES[workflowId] ?? workflowId;
}

export function getCanonicalWorkflowPricingProfile(
  workflowId: string,
): WorkflowPricingProfile | undefined {
  const profile = getWorkflowPricingProfile(pricingCatalogWorkflowId(workflowId));
  return profile ? { ...profile, workflowId } : undefined;
}

export function getCanonicalWorkflowPricingProfileOrThrow(
  workflowId: string,
): WorkflowPricingProfile {
  const profile = getWorkflowPricingProfileOrThrow(pricingCatalogWorkflowId(workflowId));
  return { ...profile, workflowId };
}

export function calculateCanonicalWorkflowQuote(input: QuoteInput): Quote {
  const pricedId = pricingCatalogWorkflowId(input.workflowId);
  const quote = calculateQuote({ ...input, workflowId: pricedId });
  return { ...quote, workflowId: input.workflowId };
}
