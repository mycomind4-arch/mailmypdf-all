/**
 * Pricing Server Functions
 *
 * These are Tanstack Start server functions that can be called from the client.
 * They run on the server and have access to the admin Supabase client.
 * The client can NEVER override pricing decisions.
 */

import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { calculateQuote, acceptQuote, getQuote, type PricingQuote } from "@mailmypdf/pricing";
import { getSupabaseAdmin } from "./supabase-admin.server";

/**
 * Calculate a pricing quote for a workflow.
 *
 * Called when the user reviews the pricing before approval.
 * The client sends only:
 *  - workflowId
 *  - mailingMethod
 *  - baseWorkflowPrice (from workflow config)
 *  - baseMailingPrice (from mailing API)
 *
 * The server independently resolves:
 *  - userId (from auth)
 *  - entitlements (from database)
 *  - pricing profile (from database)
 *  - final amount (never from client)
 */
export const createPricingQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = z.object({
      workflowId: z.string().optional(),
      workflowName: z.string().optional(),
      mailingMethod: z.enum(["first_class", "certified", "registered"]).optional(),
      baseWorkflowPriceCents: z.number().int().min(0),
      baseMailingPriceCents: z.number().int().min(0),
    }).parse(ctx.data);

    // Get authenticated user from request
    const userId = ctx.request?.headers.get("x-user-id");
    if (!userId) {
      throw new Error("Unauthorized: No user context");
    }

    // Get admin Supabase client
    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize database");
    }

    // Check if user has organization
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate quote using canonical engine
    const quote = await calculateQuote(
      {
        userId,
        organizationId: orgMember?.organization_id,
        workflowId: body.workflowId,
        workflowName: body.workflowName,
        mailingMethod: body.mailingMethod,
        baseWorkflowPriceCents: body.baseWorkflowPriceCents,
        baseMailingPriceCents: body.baseMailingPriceCents,
      },
      supabase,
      process.env.SUPABASE_URL || ""
    );

    return quote;
  },
});

/**
 * Verify a pricing quote is valid before payment.
 *
 * Checks:
 *  - Quote exists and belongs to user
 *  - Quote hasn't expired
 *  - Total matches expected amount
 */
export const verifyPricingQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = z.object({
      quoteId: z.string().uuid(),
      expectedTotalCents: z.number().int().min(0),
    }).parse(ctx.data);

    const userId = ctx.request?.headers.get("x-user-id");
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize database");
    }

    const quote = await getQuote(
      body.quoteId,
      userId,
      process.env.SUPABASE_KEY || "",
      process.env.SUPABASE_URL || ""
    );

    if (!quote) {
      throw new Error("Quote not found");
    }

    // Verify quote hasn't expired
    if (new Date() > quote.expiresAt) {
      throw new Error("Quote has expired. Please request a new quote.");
    }

    // Verify total matches
    if (quote.total !== body.expectedTotalCents) {
      throw new Error("Quote amount changed. Please review and request a new quote.");
    }

    return {
      valid: true,
      quote,
    };
  },
});

/**
 * Accept a pricing quote after payment succeeds.
 *
 * This locks the quote to the order for permanent audit trail.
 */
export const acceptPricingQuote = createServerFn({
  method: "POST",
  async handler(ctx) {
    const body = z.object({
      quoteId: z.string().uuid(),
      orderId: z.string().uuid(),
    }).parse(ctx.data);

    const userId = ctx.request?.headers.get("x-user-id");
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize database");
    }

    // Verify quote belongs to user
    const quote = await getQuote(
      body.quoteId,
      userId,
      process.env.SUPABASE_KEY || "",
      process.env.SUPABASE_URL || ""
    );

    if (!quote) {
      throw new Error("Quote not found");
    }

    // Accept the quote
    await acceptQuote(
      body.quoteId,
      body.orderId,
      process.env.SUPABASE_KEY || "",
      process.env.SUPABASE_URL || ""
    );

    return {
      success: true,
      quote,
    };
  },
});

/**
 * Get pricing quote details (for review/display).
 *
 * Shows:
 *  - Line item breakdown
 *  - What policy provides this pricing
 *  - When it expires
 *  - Visible value to user
 */
export const getPricingQuoteDetails = createServerFn({
  method: "GET",
  async handler(ctx) {
    const quoteId = ctx.request?.url.split("quoteId=")[1];
    if (!quoteId) {
      throw new Error("Missing quoteId");
    }

    const userId = ctx.request?.headers.get("x-user-id");
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const supabase = await getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize database");
    }

    const quote = await getQuote(
      quoteId,
      userId,
      process.env.SUPABASE_KEY || "",
      process.env.SUPABASE_URL || ""
    );

    if (!quote) {
      throw new Error("Quote not found");
    }

    return quote;
  },
});
