/**
 * Entitlements Server Functions
 *
 * Functions for fetching and displaying user entitlements and benefits.
 * Called from dashboard and workflow pages.
 */

import { createServerFn } from "@tanstack/start";
import { withAdmin } from "./supabase-admin.server";

/**
 * Get detailed entitlement information for current user.
 * Shows pricing benefits and policy info.
 */
export const getUserEntitlementDetails = createServerFn({
  method: "POST",
  async handler(ctx) {
    const userId = ctx.request?.headers.get("x-user-id");
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const data = await withAdmin(async (db) => {
      // Get user's active entitlement
      const entitlements = await db.rpc("get_user_entitlements", {
        p_user_id: userId,
      });

      if (entitlements.error || !entitlements.data?.length) {
        return null; // User has no special entitlements, uses default
      }

      const entitlement = entitlements.data[0];

      // Load full policy and profile details
      const { data: policy } = await db
        .from("entitlement_policies")
        .select("*, pricing_profiles(*)")
        .eq("id", entitlement.policy_id)
        .single();

      if (!policy) return null;

      const profile = policy.pricing_profiles;

      // Load default pricing for comparison
      const { data: defaultPolicy } = await db
        .from("entitlement_policies")
        .select("*, pricing_profiles(*)")
        .eq("slug", "default-public")
        .single();

      const defaultProfile = defaultPolicy?.pricing_profiles;

      return {
        policySlug: policy.slug,
        policyName: policy.name,
        policyDescription: policy.description,

        // Workflow pricing
        workflowPrice: profile.workflow_discount_percent
          ? Math.floor(
              (1900 * (100 - profile.workflow_discount_percent)) / 100
            )
          : profile.workflow_discount_cents || 0,
        normalWorkflowPrice: defaultProfile?.base_workflow_price_cents || 1900,

        // Mailing pricing
        mailingPrice: profile.mailing_at_cost
          ? 695 // Provider cost
          : 695 + profile.mailing_markup_cents - profile.mailing_subsidy_cents,
        normalMailingPrice:
          (defaultProfile?.base_mailing_price_cents || 695) +
          (defaultProfile?.mailing_markup_cents || 50),

        // Service fee
        serviceFee: profile.service_fee_waived ? 0 : profile.service_fee_cents,
        serviceFeeWaived: profile.service_fee_waived,

        // Features
        privateOfficeIncluded: policy.private_office_included,
        premiumWorkflowsIncluded: policy.premium_workflows_included,
        aiProcessingFree: policy.ai_processing_free,
        researchIncluded: policy.research_included,

        // Expiration
        expiresAt: entitlement.expires_at,
        isExpired: entitlement.expires_at
          ? new Date(entitlement.expires_at) < new Date()
          : false,
      };
    });

    return data;
  },
});

/**
 * Get visible benefits for display on dashboard/checkout.
 * Shows what user saves with their current entitlements.
 */
export const getUserVisibleBenefits = createServerFn({
  method: "POST",
  async handler(ctx) {
    const details = await getUserEntitlementDetails.fetch();

    if (!details) {
      return null; // No special entitlements
    }

    return {
      items: [
        {
          label: "Workflows",
          normalPrice: details.normalWorkflowPrice,
          yourPrice: details.workflowPrice,
          savings: details.normalWorkflowPrice - details.workflowPrice,
        },
        {
          label: "Certified Mail",
          normalPrice: details.normalMailingPrice,
          yourPrice: details.mailingPrice,
          savings: details.normalMailingPrice - details.mailingPrice,
        },
        ...(details.serviceFeeWaived
          ? [
              {
                label: "Service Fees",
                normalPrice: 99,
                yourPrice: 0,
                savings: 99,
              },
            ]
          : []),
        ...(details.privateOfficeIncluded
          ? [
              {
                label: "Private Office",
                normalPrice: 0,
                yourPrice: 0,
                savings: 0, // Part of package
                included: true,
              },
            ]
          : []),
      ],
      totalMonthlySavings:
        (details.normalWorkflowPrice - details.workflowPrice) * 25 + // Assuming 25 workflows/month
        (details.normalMailingPrice - details.mailingPrice) * 5 + // Assuming 5 mailings/month
        (details.serviceFeeWaived ? 99 * 25 : 0), // Service fee savings
      policyName: details.policyName,
      expiresAt: details.expiresAt,
    };
  },
});

/**
 * Check if user has a specific feature enabled.
 * Used for gating premium features.
 */
export const hasFeature = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = ctx.data as { feature: "private-office" | "premium-workflows" | "ai-free" | "research" };
    const userId = ctx.request?.headers.get("x-user-id");

    if (!userId) {
      return false;
    }

    const details = await getUserEntitlementDetails.fetch();

    if (!details) {
      return false; // Default user, no special features
    }

    const featureMap = {
      "private-office": details.privateOfficeIncluded,
      "premium-workflows": details.premiumWorkflowsIncluded,
      "ai-free": details.aiProcessingFree,
      research: details.researchIncluded,
    };

    return featureMap[body.feature] || false;
  },
});
