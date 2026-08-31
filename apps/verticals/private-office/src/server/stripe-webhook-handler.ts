/**
 * Stripe webhook handler.
 *
 * Processes Stripe webhook events at the `/api/stripe/webhook` endpoint.
 * This is a raw HTTP handler — NOT a TanStack Start server function —
 * because Stripe sends raw JSON POST bodies with a signature header
 * that must be verified before any processing.
 *
 * Architecture:
 *   Stripe → POST /api/stripe/webhook → signature verification → event processing
 *                                                                    ↓
 *                                                           PaymentEvidence persistence
 *
 * Supported events:
 *   - checkout.session.completed → markVerified (idempotent)
 *   - payment_intent.payment_failed → markFailed (idempotent)
 *
 * Idempotency: The repository's markVerified and markFailed are idempotent.
 * Duplicate webhook delivery for the same session is harmless.
 *
 * SECURITY:
 * - Webhook signature is ALWAYS verified using STRIPE_WEBHOOK_SECRET.
 * - No processing occurs if the signature is invalid.
 * - PaymentEvidence status transitions are enforced by the repository.
 * - A verified payment can never be overwritten to failed.
 * - A failed payment can never be promoted to verified.
 */

import type { Stripe } from "stripe";
import type { StripeAdapter } from "@/platform/stripe-adapter";
import type { PaymentEvidenceRepository } from "@/domain/payment-evidence";

export interface WebhookHandlerConfig {
  stripeAdapter: StripeAdapter;
  paymentEvidenceRepository: PaymentEvidenceRepository;
  webhookSecret: string;
}

/**
 * Handle a Stripe webhook request.
 *
 * Returns a Response object suitable for the HTTP handler.
 */
export async function handleStripeWebhook(
  request: Request,
  config: WebhookHandlerConfig,
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Stripe requires the raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Verify the webhook signature
  let event: Stripe.Event;
  try {
    event = config.stripeAdapter.constructWebhookEvent(
      rawBody,
      signature,
      config.webhookSecret,
    );
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Process the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const paymentIntentId = session.payment_intent as string;

        if (!paymentIntentId) {
          return Response.json(
            { error: "Missing payment intent ID in session" },
            { status: 400 },
          );
        }

        // Idempotent: markVerified returns existing record if already verified
        await config.paymentEvidenceRepository.markVerified(
          sessionId,
          paymentIntentId,
        );

        return Response.json({ received: true, status: "verified" });
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const sessionId = intent.metadata?.session_id;

        if (!sessionId) {
          // No session ID in metadata — cannot link to evidence
          // This can happen for payments not created through checkout
          return Response.json({ received: true, status: "unlinked" });
        }

        await config.paymentEvidenceRepository.markFailed(
          sessionId,
          intent.last_payment_error?.message ?? "Payment failed",
        );

        return Response.json({ received: true, status: "failed" });
      }

      default:
        // Unhandled event type — acknowledge but don't process
        return Response.json({ received: true, status: "unhandled" });
    }
  } catch (err) {
    // Log the error server-side, return 500 so Stripe retries
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
