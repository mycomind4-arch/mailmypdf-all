/**
 * Pricing Quote Server Functions (Tanstack Start)
 *
 * These functions handle pricing calculation and quote management.
 * They run on the server and enforce security constraints:
 * - Client cannot override pricing
 * - Quotes are immutable audit trails
 * - User entitlements are server-resolved
 * - Complete lineage is stored for compliance
 */

import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import type { Database } from "~/lib/supabase/types";
import { getSupabaseServer } from "~/lib/supabase/server";
import { calculateQuote as calcPricingQuote } from "@mailmypdf/pricing";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateQuoteInputSchema = z.object({
  workflowId: z.string().min(1),
  verticalId: z.string().min(1),
  actualPages: z.number().int().positive(),
  mailClass: z.enum(["standard", "certified", "registered"]).optional(),
  discountCode: z.string().optional(),
});

export type CreateQuoteInput = z.infer<typeof CreateQuoteInputSchema>;

const VerifyQuoteInputSchema = z.object({
  quoteId: z.string().uuid(),
});

const AcceptQuoteInputSchema = z.object({
  quoteId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
});

// ============================================================================
// CREATE PRICING QUOTE
// ============================================================================

/**
 * Calculate a pricing quote for a workflow.
 *
 * Workflow:
 * 1. User calls this server function from client
 * 2. Server resolves user entitlements
 * 3. Server loads pricing profile
 * 4. Server calculates quote based on entitlements
 * 5. Server stores immutable quote in database
 * 6. Returns quote ID and breakdown to client
 *
 * Client cannot override pricing. Quote is auditable with full lineage.
 */
export const createPricingQuote = createServerFn(
  "POST /api/quotes/create",
  async (input: CreateQuoteInput, { request }) => {
    try {
      // Validate input
      const validInput = CreateQuoteInputSchema.parse(input);

      // Get authenticated user
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Failed to get user context");
      }

      // ────────────────────────────────────────────────────────────────
      // STEP 1: Resolve user entitlements
      // ────────────────────────────────────────────────────────────────

      const { data: entitlements, error: entError } = await supabase
        .rpc("get_user_entitlements", { p_user_id: user.id })
        .single();

      if (entError && entError.code !== "PGRST116") {
        // PGRST116 = no rows, which is OK (use default)
        console.error("Error resolving entitlements:", entError);
      }

      // If no entitlements, use default policy
      let policyId: string | null = null;
      let assignmentId: string | null = null;

      if (entitlements) {
        policyId = entitlements.policy_id as string;
        assignmentId = entitlements.assignment_id as string;
      } else {
        // Get default-public policy
        const { data: defaultPolicy, error: policyError } = await supabase
          .from("entitlement_policies")
          .select("id")
          .eq("policy_slug", "default-public")
          .eq("commercial_status", "active")
          .single();

        if (policyError || !defaultPolicy) {
          throw new Error("No pricing policy available");
        }

        policyId = defaultPolicy.id;
      }

      // ────────────────────────────────────────────────────────────────
      // STEP 2: Get active pricing profile for policy
      // ────────────────────────────────────────────────────────────────

      const { data: profile, error: profileError } = await supabase
        .from("pricing_profiles")
        .select("*")
        .eq("policy_id", policyId)
        .eq("is_active", true)
        .eq("commercial_status", "production")
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (profileError || !profile) {
        throw new Error("Pricing profile not available");
      }

      // ────────────────────────────────────────────────────────────────
      // STEP 3: Calculate quote using pricing engine
      // ────────────────────────────────────────────────────────────────

      const quote = calcPricingQuote({
        workflowId: validInput.workflowId,
        verticalId: validInput.verticalId,
        actualPages: validInput.actualPages,
        mailClass: validInput.mailClass || "standard",
        discountCode: validInput.discountCode,
      });

      // Apply entitlement discounts on top of workflow pricing
      let workflowPrice = quote.basePriceCents;
      const policy = (entitlements?.policy_id
        ? { data: { data: { id: policyId } } }
        : { data: { data: null } }) as any;

      // Load policy for discount info
      const { data: policyData } = await supabase
        .from("entitlement_policies")
        .select("*")
        .eq("id", policyId)
        .single();

      if (policyData) {
        if (policyData.workflow_discount_percent > 0) {
          workflowPrice = Math.floor(
            workflowPrice * (1 - policyData.workflow_discount_percent / 100)
          );
        }
        if (policyData.workflow_discount_cents > 0) {
          workflowPrice = Math.max(
            0,
            workflowPrice - policyData.workflow_discount_cents
          );
        }
      }

      const workflowDiscount = quote.basePriceCents - workflowPrice;

      // Calculate final total
      const finalTotal =
        workflowPrice +
        quote.mailServiceCost +
        quote.extraPageCost +
        (policyData?.service_fee_cents || 0) -
        (quote.discountCents || 0);

      // ────────────────────────────────────────────────────────────────
      // STEP 4: Store immutable quote in database
      // ────────────────────────────────────────────────────────────────

      const { data: storedQuote, error: insertError } = await supabase
        .from("pricing_quotes")
        .insert({
          user_id: user.id,
          workflow_id: validInput.workflowId,
          vertical_id: validInput.verticalId,
          workflow_base_cents: quote.basePriceCents,
          workflow_discount_cents: workflowDiscount,
          mailing_service_cost_cents: quote.mailServiceCost,
          extra_page_cost_cents: quote.extraPageCost,
          discount_code_value_cents: quote.discountCents || 0,
          discount_code: validInput.discountCode || null,
          total_cents: Math.max(0, finalTotal),
          assignment_id: assignmentId,
          policy_id: policyId,
          profile_id: profile.id,
          status: "pending",
          mailing_class: validInput.mailClass || "standard",
          expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          metadata: {
            source: "create_pricing_quote",
            pages: validInput.actualPages,
          },
        })
        .select()
        .single();

      if (insertError || !storedQuote) {
        throw new Error(`Failed to store quote: ${insertError?.message}`);
      }

      // ────────────────────────────────────────────────────────────────
      // STEP 5: Log to audit trail
      // ────────────────────────────────────────────────────────────────

      await supabase.from("entitlements_audit_log").insert({
        actor_user_id: user.id,
        action: "quote_created",
        resource_type: "quote",
        resource_id: storedQuote.id,
        changes: {
          workflow_id: validInput.workflowId,
          total_cents: storedQuote.total_cents,
          policy_id: policyId,
        },
        reason: "User requested workflow quote",
      });

      return {
        success: true,
        quoteId: storedQuote.id,
        totalCents: storedQuote.total_cents,
        expiresAt: storedQuote.expires_at,
        lineItems: {
          workflowBase: quote.basePriceCents,
          workflowDiscount: workflowDiscount,
          mailingService: quote.mailServiceCost,
          extraPages: quote.extraPageCost,
          serviceFee: policyData?.service_fee_cents || 0,
          discountCode: quote.discountCents || 0,
          total: Math.max(0, finalTotal),
        },
        metadata: {
          assignmentId,
          policyId,
          profileId: profile.id,
        },
      };
    } catch (error) {
      console.error("Error creating quote:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create quote",
      };
    }
  }
);

// ============================================================================
// VERIFY PRICING QUOTE
// ============================================================================

/**
 * Verify a quote is valid before payment.
 * Checks:
 * - Quote still exists
 * - Quote hasn't expired
 * - Quote is owned by current user
 * - Quote is in pending status
 */
export const verifyPricingQuote = createServerFn(
  "POST /api/quotes/verify",
  async (input: VerifyQuoteInputSchema, { request }) => {
    try {
      const validInput = VerifyQuoteInputSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Failed to get user context");
      }

      // Verify quote exists and belongs to user
      const { data: quote, error: quoteError } = await supabase
        .from("pricing_quotes")
        .select("*")
        .eq("id", validInput.quoteId)
        .eq("user_id", user.id)
        .single();

      if (quoteError || !quote) {
        return { success: false, error: "Quote not found or access denied" };
      }

      // Check expiration
      const expiresAt = new Date(quote.expires_at);
      if (expiresAt < new Date()) {
        return { success: false, error: "Quote has expired" };
      }

      // Check status
      if (quote.status !== "pending") {
        return {
          success: false,
          error: `Quote is ${quote.status}, not pending`,
        };
      }

      return {
        success: true,
        quoteId: quote.id,
        totalCents: quote.total_cents,
        expiresAt: quote.expires_at,
        status: quote.status,
      };
    } catch (error) {
      console.error("Error verifying quote:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to verify quote",
      };
    }
  }
);

// ============================================================================
// ACCEPT PRICING QUOTE
// ============================================================================

/**
 * Accept a quote after payment succeeds.
 * Marks quote as accepted and links to order.
 * Quote is now locked and immutable.
 */
export const acceptPricingQuote = createServerFn(
  "POST /api/quotes/accept",
  async (input: AcceptQuoteInputSchema, { request }) => {
    try {
      const validInput = AcceptQuoteInputSchema.parse(input);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Failed to get user context");
      }

      // Verify quote exists and belongs to user
      const { data: quote, error: quoteError } = await supabase
        .from("pricing_quotes")
        .select("*")
        .eq("id", validInput.quoteId)
        .eq("user_id", user.id)
        .single();

      if (quoteError || !quote) {
        throw new Error("Quote not found or access denied");
      }

      // Update quote status
      const { error: updateError } = await supabase
        .from("pricing_quotes")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          metadata: {
            ...quote.metadata,
            order_id: validInput.orderId,
            accepted_by_server_at: new Date().toISOString(),
          },
        })
        .eq("id", validInput.quoteId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(`Failed to accept quote: ${updateError.message}`);
      }

      // Log acceptance
      await supabase.from("entitlements_audit_log").insert({
        actor_user_id: user.id,
        action: "quote_accepted",
        resource_type: "quote",
        resource_id: validInput.quoteId,
        changes: { status: "accepted" },
        reason: "Payment successful, quote locked",
        metadata: { order_id: validInput.orderId },
      });

      return {
        success: true,
        quoteId: validInput.quoteId,
        status: "accepted",
        acceptedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error accepting quote:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to accept quote",
      };
    }
  }
);

// ============================================================================
// GET PRICING QUOTE DETAILS
// ============================================================================

/**
 * Retrieve full quote details for display or auditing.
 */
export const getPricingQuoteDetails = createServerFn(
  "GET /api/quotes/:quoteId",
  async ({ quoteId }, { request }) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.slice(7);
      const supabase = await getSupabaseServer({ token });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Failed to get user context");
      }

      // Get quote with related policy info
      const { data: quote, error: quoteError } = await supabase
        .from("pricing_quotes")
        .select(
          `
          *,
          policy_id:entitlement_policies(policy_slug, display_name),
          profile_id:pricing_profiles(workflow_base_cents, service_fee_cents)
        `
        )
        .eq("id", quoteId)
        .eq("user_id", user.id)
        .single();

      if (quoteError || !quote) {
        throw new Error("Quote not found or access denied");
      }

      return {
        success: true,
        quote: {
          id: quote.id,
          status: quote.status,
          workflowId: quote.workflow_id,
          verticalId: quote.vertical_id,
          totalCents: quote.total_cents,
          expiresAt: quote.expires_at,
          acceptedAt: quote.accepted_at,
          createdAt: quote.created_at,
          lineItems: {
            workflowBase: quote.workflow_base_cents,
            workflowDiscount: quote.workflow_discount_cents,
            mailingService: quote.mailing_service_cost_cents,
            extraPages: quote.extra_page_cost_cents,
            discountCode: quote.discount_code_value_cents,
          },
          policy: quote.policy_id,
          profile: quote.profile_id,
        },
      };
    } catch (error) {
      console.error("Error getting quote details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve quote details",
      };
    }
  }
);
