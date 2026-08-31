/**
 * POST /api/v1/appeal-reply/mail-appeal
 *
 * Takes the finalized appeal letter + addresses + email + mail class
 * and creates a MailMyPDF letter order via MailService.createOrderFromLetter().
 *
 * Returns the order ID, token, page count, price, and a checkout URL
 * the user can navigate to in order to pay and have the letter mailed.
 *
 * This endpoint reuses the existing MailService — no duplicate mailing logic.
 * After order creation, the user follows the standard MailMyPDF checkout flow.
 *
 * Idempotency: The endpoint accepts an optional idempotencyKey. When present,
 * it hashes the key + email + letter text to detect duplicate submissions.
 * The in-memory cache prevents double-click and browser-retry duplicates.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MailAppealInputSchema } from "@/products/appeal-reply/mail-model";

// ── Idempotency cache (in-memory, single-instance) ──────────────────────────
// Stores the result for a given dedup key for 10 minutes.
// Key = hash(idempotencyKey + email + first 500 chars of letterText)
const idempotencyCache = new Map<string, { result: Record<string, unknown>; expires: number }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

function computeDedupKey(key: string, email: string, letterText: string): string {
  // Simple hash — not crypto-secure, just for dedup
  const input = `${key}:${email}:${letterText.slice(0, 500)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit
  }
  return `dedup_${Math.abs(hash).toString(36)}`;
}

// ── Safe error message (never leaks internal details) ───────────────────────
function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Map known internal errors to safe user messages
    if (err.message.includes("Too many orders")) return "Too many orders. Please try again later.";
    if (err.message.includes("Invalid email")) return "Please provide a valid email address.";
    if (err.message.includes("Invalid ZIP")) return "Please provide a valid ZIP code.";
    if (err.message.includes("State must be")) return "Please provide a valid 2-letter state abbreviation.";
    // Don't leak internal error details (DB errors, Stripe errors, etc.)
    return "We could not create your mail order. Please check your information and try again.";
  }
  return "We could not create your mail order. Please try again.";
}

export const Route = createFileRoute("/api/v1/appeal-reply/mail-appeal")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // ── Validate content type ──────────────────────────────────────────
          const contentType = request.headers.get("content-type") || "";
          if (!contentType.toLowerCase().includes("application/json")) {
            return Response.json(
              {
                error: {
                  type: "unsupported_media_type",
                  message: "mail-appeal accepts JSON only",
                  code: "INVALID_CONTENT_TYPE",
                },
              },
              { status: 415 },
            );
          }

          // ── Parse and validate input ────────────────────────────────────────
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message: "Invalid JSON body",
                  code: "INVALID_JSON",
                },
              },
              { status: 400 },
            );
          }

          let input;
          try {
            input = MailAppealInputSchema.parse(body);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Validation failed";
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message,
                  code: "INVALID_INPUT",
                },
              },
              { status: 400 },
            );
          }

          // ── Idempotency check ──────────────────────────────────────────────
          if (input.idempotencyKey) {
            const dedupKey = computeDedupKey(input.idempotencyKey, input.email, input.letterText);
            const cached = idempotencyCache.get(dedupKey);
            if (cached && cached.expires > Date.now()) {
              // Return the exact same result — duplicate submission detected
              return Response.json(cached.result);
            }
            // Clean up expired entries (lazy GC)
            for (const [k, v] of idempotencyCache.entries()) {
              if (v.expires <= Date.now()) idempotencyCache.delete(k);
            }
          }

          // ── Create order via MailService ────────────────────────────────────
          const { getMailService } = await import("@/services");

          const result = await getMailService().createOrderFromLetter({
            email: input.email,
            sender: {
              name: input.sender.name,
              line1: input.sender.line1,
              line2: input.sender.line2 || null,
              city: input.sender.city,
              state: input.sender.state,
              postalCode: input.sender.postalCode,
            },
            recipient: {
              name: input.recipient.name,
              line1: input.recipient.line1,
              line2: input.recipient.line2 || null,
              city: input.recipient.city,
              state: input.recipient.state,
              postalCode: input.recipient.postalCode,
            },
            letterText: input.letterText,
            color: false,
            mailClass: input.mailClass,
          });

          // ── Return order details + checkout URL ────────────────────────────
          const checkoutUrl = `/orders/${result.orderId}?token=${result.token}&paid=1`;

          const responsePayload = {
            orderId: result.orderId,
            token: result.token,
            pageCount: result.pageCount,
            priceCents: result.priceCents,
            mailClass: input.mailClass,
            checkoutUrl,
          };

          // ── Cache for idempotency ──────────────────────────────────────────
          if (input.idempotencyKey) {
            const dedupKey = computeDedupKey(input.idempotencyKey, input.email, input.letterText);
            idempotencyCache.set(dedupKey, {
              result: responsePayload,
              expires: Date.now() + IDEMPOTENCY_TTL_MS,
            });
          }

          return Response.json(responsePayload);
        } catch (err) {
          return Response.json(
            {
              error: {
                type: "order_error",
                message: safeErrorMessage(err),
                code: "MAIL_APPEAL_FAILED",
              },
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
