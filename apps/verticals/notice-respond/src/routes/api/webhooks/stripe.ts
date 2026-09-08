/**
 * POST /api/webhooks/stripe
 *
 * Notice Respond Stripe webhook. Stripe signature verification remains
 * vertical/runtime-specific; payment -> fulfillment correctness is shared.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  handleStripeWebhookEvent,
  createSupabaseIntentStore,
  createMailMyPDFClient,
} from "@/platform/fulfillment-adapter";

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secretKey || !webhookSecret) {
          return Response.json(
            {
              error: "Stripe webhook is not configured.",
            },
            { status: 503 }
          );
        }

        // ── Read raw body ──────────────────────────────────────────
        const rawBody = await request.text();

        // ── Get Stripe signature ───────────────────────────────────
        const signature =
          request.headers.get("stripe-signature") ||
          request.headers.get("Stripe-Signature");

        if (!signature) {
          return Response.json(
            {
              error: "Missing Stripe signature header.",
            },
            { status: 400 }
          );
        }

        // ── Verify webhook signature ───────────────────────────────
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secretKey, {
          apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
        });

        let stripeEvent: Stripe.Event;
        try {
          stripeEvent = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret
          );
        } catch (err) {
          return Response.json(
            {
              error: `Webhook signature verification failed: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            },
            { status: 400 }
          );
        }

        // ── Delegate to shared fulfillment engine ──────────────────
        try {
          const result = await handleStripeWebhookEvent(
            {
              type: stripeEvent.type,
              data: {
                object: stripeEvent.data.object as Record<string, unknown>,
              },
            },
            {
              store: createSupabaseIntentStore(),
              client: createMailMyPDFClient(),
              verticalName: "notice-respond",
              stripeSecretKey: secretKey,
              stripeWebhookSecret: webhookSecret,
            }
          );
          return Response.json(result);
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : "Webhook processing failed",
            },
            { status: 502 }
          );
        }
      },
    },
  },
});
