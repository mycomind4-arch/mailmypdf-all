/**
 * DisputeMail API — Finalize
 *
 * POST /api/v1/dispute-mail/finalize
 *
 * Takes a finalized dispute letter and creates a canonical MailMyPDF order
 * with vertical metadata. Does NOT create a separate order system.
 *
 * The order then flows through:
 *   canonical order → Stripe checkout → Lob fulfillment → USPS → tracking → proof
 *
 * Returns orderId + token for checkout handoff.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getMailService } from "@/services";
import { sanitizeEmail, sanitizeAddress, sanitizePlainText } from "@/lib/sanitize";
import type { MailClass } from "@/lib/pricing";

const addressSchema = z.object({
  name: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

const finalizeSchema = z.object({
  email: z.string().email().max(200),
  sender: addressSchema,
  recipient: addressSchema,
  letterText: z.string().min(1).max(20_000),
  color: z.boolean().default(false),
  mailClass: z.enum(["standard", "certified", "registered"]).default("standard"),
  /** Dispute-specific metadata stored in vertical_metadata */
  disputeMetadata: z.object({
    category: z.string().optional(),
    disputeSubject: z.string().optional(),
    amount: z.string().optional(),
    referenceNumber: z.string().optional(),
  }).optional(),
});

export const Route = createFileRoute("/api/v1/dispute-mail/finalize")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Rate limit: 5 finalizations per hour per IP
          const ip = getClientIp(request);
          const rl = rateLimit(ip, "dispute-mail-finalize", {
            maxRequests: 5,
            windowMs: 3_600_000,
          });
          if (!rl.allowed) {
            return Response.json(
              { error: "Too many requests. Please try again later." },
              { status: 429 },
            );
          }

          const body = await request.json();
          const parsed = finalizeSchema.parse(body);

          const mailService = getMailService();

          // Create a canonical order from the letter text — same as Write flow
          const result = await mailService.createOrderFromLetter({
            email: parsed.email,
            sender: parsed.sender,
            recipient: parsed.recipient,
            letterText: parsed.letterText,
            color: parsed.color,
            mailClass: parsed.mailClass,
          });

          // Tag the order with vertical metadata
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("orders")
            .update({
              vertical_slug: "dispute-mail",
              vertical_metadata: {
                vertical_slug: "dispute-mail",
                workflow: "dispute",
                context: parsed.disputeMetadata ?? {},
              },
            })
            .eq("id", result.orderId);

          // Record vertical-specific event
          await supabaseAdmin.from("order_events").insert({
            order_id: result.orderId,
            type: "dispute.finalized",
            label: "Dispute letter finalized",
            metadata: parsed.disputeMetadata ?? {},
            vertical_slug: "dispute-mail",
          });

          return Response.json({
            orderId: result.orderId,
            token: result.token,
            pageCount: result.pageCount,
            priceCents: result.priceCents,
          });
        } catch (e: any) {
          if (e instanceof z.ZodError) {
            return Response.json(
              { error: "Invalid input", details: e.errors },
              { status: 400 },
            );
          }
          return Response.json(
            { error: e?.message || "Finalization failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
