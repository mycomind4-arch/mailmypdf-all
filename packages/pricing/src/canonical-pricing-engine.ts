/**
 * Canonical Pricing Engine
 *
 * CRITICAL: All workflows MUST call this function to calculate quotes.
 * Never let workflows implement their own pricing logic.
 *
 * This function:
 * 1. Resolves user entitlements (user-level → org-level → default)
 * 2. Loads the pricing profile
 * 3. Applies discounts, credits, subsidies
 * 4. Returns an auditable quote with full lineage
 * 5. Stores the quote in the database
 *
 * The server (NOT the client) always makes the final pricing decision.
 */

import { createClient } from "@supabase/supabase-js";

export interface CalculateQuoteRequest {
  userId: string;
  organizationId?: string;
  workflowId?: string;
  workflowName?: string;
  mailingMethod?: "first_class" | "certified" | "registered";
  baseWorkflowPriceCents: number;
  baseMailingPriceCents: number;
}

export interface PricingLineItem {
  label: string;
  amount: number;
  description?: string;
}

export interface PricingQuote {
  quoteId: string;
  userId: string;
  organizationId?: string;

  // Request details
  workflowId?: string;
  workflowName?: string;
  mailingMethod?: string;

  // Pricing breakdown
  baseWorkflowPrice: number;
  baseMailingPrice: number;
  workflowDiscount: number;
  workflowPrice: number;
  mailingSubsidy: number;
  mailingMarkup: number;
  mailingPrice: number;
  serviceFee: number;
  platformFee: number;
  total: number;

  // Why this price?
  pricingPolicySlug: string;
  pricingProfileId: string;
  entitlementAssignmentId: string;
  lineItems: PricingLineItem[];

  // Validity
  expiresAt: Date;
  acceptedAt?: Date;
}

/**
 * Calculate a pricing quote for a workflow execution.
 *
 * NEVER call this from the browser.
 * ALWAYS call this server-side before charging the user.
 */
export async function calculateQuote(
  request: CalculateQuoteRequest,
  supabaseAdminKey: string,
  supabaseUrl: string
): Promise<PricingQuote> {
  const supabase = createClient(supabaseUrl, supabaseAdminKey, {
    auth: { persistSession: false },
  });

  // 1. Resolve user entitlements
  const entitlements = await supabase.rpc("get_user_entitlements", {
    p_user_id: request.userId,
  });

  if (entitlements.error) {
    throw new Error(`Failed to resolve entitlements: ${entitlements.error.message}`);
  }

  if (!entitlements.data || entitlements.data.length === 0) {
    throw new Error("No active entitlements for this user");
  }

  const entitlement = entitlements.data[0];

  // 2. Load entitlement policy and pricing profile
  const { data: policy, error: policyError } = await supabase
    .from("entitlement_policies")
    .select("*, pricing_profiles(*)")
    .eq("id", entitlement.policy_id)
    .single();

  if (policyError || !policy) {
    throw new Error(`Failed to load pricing policy: ${policyError?.message}`);
  }

  const pricingProfile = policy.pricing_profiles;

  // 3. Calculate pricing

  // Workflow pricing
  let workflowPrice = request.baseWorkflowPriceCents;
  let workflowDiscount = 0;

  if (pricingProfile.workflow_discount_percent > 0) {
    workflowDiscount = Math.floor(
      (request.baseWorkflowPriceCents * pricingProfile.workflow_discount_percent) / 100
    );
    workflowPrice = request.baseWorkflowPriceCents - workflowDiscount;
  } else if (pricingProfile.workflow_discount_cents !== null) {
    workflowDiscount = pricingProfile.workflow_discount_cents;
    workflowPrice = Math.max(0, request.baseWorkflowPriceCents - workflowDiscount);
  }

  // Apply AI processing free
  if (policy.ai_processing_free) {
    workflowPrice = 0;
    workflowDiscount = request.baseWorkflowPriceCents;
  }

  // Mailing pricing
  let mailingPrice = request.baseMailingPriceCents;
  let mailingMarkup = pricingProfile.mailing_markup_cents;
  let mailingSubsidy = 0;

  if (pricingProfile.mailing_at_cost) {
    mailingMarkup = 0;
  } else if (pricingProfile.mailing_subsidy_cents > 0) {
    mailingSubsidy = pricingProfile.mailing_subsidy_cents;
    mailingMarkup = Math.max(0, mailingMarkup - mailingSubsidy);
  }

  mailingPrice = request.baseMailingPriceCents + mailingMarkup;

  // Service fee
  let serviceFee = pricingProfile.service_fee_cents;
  if (pricingProfile.service_fee_waived) {
    serviceFee = 0;
  }

  // Platform fee
  let platformFee = 0;
  if (!pricingProfile.platform_fee_waived) {
    platformFee = 0; // Can be set per-order if needed
  }

  // Total
  const total = workflowPrice + mailingPrice + serviceFee + platformFee;

  // 4. Build line items for display
  const lineItems: PricingLineItem[] = [
    {
      label: "Base workflow price",
      amount: request.baseWorkflowPriceCents,
    },
  ];

  if (workflowDiscount > 0) {
    lineItems.push({
      label: policy.ai_processing_free ? "AI processing (included)" : "Workflow discount",
      amount: -workflowDiscount,
      description: policy.slug,
    });
  }

  lineItems.push({
    label: "Mailing (provider cost)",
    amount: request.baseMailingPriceCents,
  });

  if (mailingMarkup > 0) {
    lineItems.push({
      label: "Mailing service fee",
      amount: mailingMarkup,
    });
  }

  if (mailingSubsidy > 0) {
    lineItems.push({
      label: "Mailing subsidy",
      amount: -mailingSubsidy,
    });
  }

  if (serviceFee > 0) {
    lineItems.push({
      label: "Service fee",
      amount: serviceFee,
    });
  }

  // 5. Create pricing quote in database
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const { data: quote, error: quoteError } = await supabase
    .from("pricing_quotes")
    .insert({
      user_id: request.userId,
      organization_id: request.organizationId || null,
      workflow_id: request.workflowId || null,
      workflow_name: request.workflowName || null,
      mailing_method: request.mailingMethod || null,

      base_workflow_price_cents: request.baseWorkflowPriceCents,
      base_mailing_price_cents: request.baseMailingPriceCents,

      workflow_discount_cents: workflowDiscount,
      workflow_price_cents: workflowPrice,

      mailing_subsidy_cents: mailingSubsidy,
      mailing_price_cents: mailingPrice,

      service_fee_cents: serviceFee,
      platform_fee_cents: platformFee,

      total_cents: total,

      pricing_profile_id: pricingProfile.id,
      entitlement_policy_id: policy.id,
      entitlement_assignment_id: entitlement.assignment_id,

      line_items: lineItems,

      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (quoteError || !quote) {
    throw new Error(`Failed to create pricing quote: ${quoteError?.message}`);
  }

  // 6. Return auditable quote
  return {
    quoteId: quote.id,
    userId: quote.user_id,
    organizationId: quote.organization_id,

    workflowId: quote.workflow_id,
    workflowName: quote.workflow_name,
    mailingMethod: quote.mailing_method,

    baseWorkflowPrice: quote.base_workflow_price_cents,
    baseMailingPrice: quote.base_mailing_price_cents,

    workflowDiscount: quote.workflow_discount_cents,
    workflowPrice: quote.workflow_price_cents,

    mailingSubsidy: quote.mailing_subsidy_cents,
    mailingMarkup: mailingMarkup,
    mailingPrice: quote.mailing_price_cents,

    serviceFee: quote.service_fee_cents,
    platformFee: quote.platform_fee_cents,

    total: quote.total_cents,

    pricingPolicySlug: policy.slug,
    pricingProfileId: quote.pricing_profile_id,
    entitlementAssignmentId: quote.entitlement_assignment_id,

    lineItems: quote.line_items,

    expiresAt: new Date(quote.expires_at),
    acceptedAt: quote.accepted_at ? new Date(quote.accepted_at) : undefined,
  };
}

/**
 * Accept a pricing quote (mark it as accepted in the database).
 * Called after payment is successful to lock the quote.
 */
export async function acceptQuote(
  quoteId: string,
  orderId: string,
  supabaseAdminKey: string,
  supabaseUrl: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseAdminKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("pricing_quotes")
    .update({
      order_id: orderId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) {
    throw new Error(`Failed to accept quote: ${error.message}`);
  }
}

/**
 * Get a pricing quote (for auditing or displaying to user).
 * IMPORTANT: Verify the quote is still valid before charging.
 */
export async function getQuote(
  quoteId: string,
  userId: string,
  supabaseAdminKey: string,
  supabaseUrl: string
): Promise<PricingQuote | null> {
  const supabase = createClient(supabaseUrl, supabaseAdminKey, {
    auth: { persistSession: false },
  });

  const { data: quote, error } = await supabase
    .from("pricing_quotes")
    .select("*, pricing_profiles(*), entitlement_policies(slug)")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .single();

  if (error || !quote) {
    return null;
  }

  return {
    quoteId: quote.id,
    userId: quote.user_id,
    organizationId: quote.organization_id,

    workflowId: quote.workflow_id,
    workflowName: quote.workflow_name,
    mailingMethod: quote.mailing_method,

    baseWorkflowPrice: quote.base_workflow_price_cents,
    baseMailingPrice: quote.base_mailing_price_cents,

    workflowDiscount: quote.workflow_discount_cents,
    workflowPrice: quote.workflow_price_cents,

    mailingSubsidy: quote.mailing_subsidy_cents,
    mailingMarkup: quote.pricing_profiles.mailing_markup_cents,
    mailingPrice: quote.mailing_price_cents,

    serviceFee: quote.service_fee_cents,
    platformFee: quote.platform_fee_cents,

    total: quote.total_cents,

    pricingPolicySlug: quote.entitlement_policies.slug,
    pricingProfileId: quote.pricing_profile_id,
    entitlementAssignmentId: quote.entitlement_assignment_id,

    lineItems: quote.line_items,

    expiresAt: new Date(quote.expires_at),
    acceptedAt: quote.accepted_at ? new Date(quote.accepted_at) : undefined,
  };
}
