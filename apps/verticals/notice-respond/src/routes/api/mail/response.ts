/**
 * POST /api/mail/response
 *
 * Authenticated browser-return fallback for Notice Respond.
 * Stripe payment/session authorization remains here; fulfillment correctness
 * is delegated to the canonical payment-fulfillment engine.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { fulfillFromBrowserReturn } from "@mailmypdf/payment-fulfillment";
import {
  createSupabaseIntentStore,
  createMailMyPDFClient,
} from "@/platform/fulfillment-adapter";

export const Route = createFileRoute("/api/mail/response")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const input = (await request.json()) as { stripeSessionId?: string };
          const sessionId = input?.stripeSessionId?.trim();
          if (!sessionId) {
            return Response.json(
              { error: "Stripe Checkout Session ID is required." },
              { status: 400 }
            );
          }

          const secretKey = process.env.STRIPE_SECRET_KEY;
          if (!secretKey) {
            return Response.json(
              { error: "Stripe is not configured." },
              { status: 503 }
            );
          }

          const { default: Stripe } = await import("stripe");
          const stripe = new Stripe(secretKey, {
            apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
          });
          let session: Stripe.Checkout.Session;
          try {
            session = await stripe.checkout.sessions.retrieve(sessionId);
          } catch {
            return Response.json(
              { error: "Invalid Stripe Checkout Session." },
              { status: 400 }
            );
          }

          if (session.payment_status !== "paid") {
            return Response.json(
              { error: "Payment has not been completed." },
              { status: 409 }
            );
          }

          const intentId = session.metadata?.mailing_intent_id;
          const ownerId = session.metadata?.owner_user_id;
          if (!intentId || ownerId !== user.id) {
            return Response.json(
              {
                error: "Payment session does not belong to this account.",
              },
              { status: 403 }
            );
          }

          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
          const result = await fulfillFromBrowserReturn(
            createSupabaseIntentStore(),
            createMailMyPDFClient(),
            intentId,
            session.id,
            paymentIntentId,
            "notice-respond"
          );

          if (!result.success) {
            const status = result.error?.includes("Integrity check")
              ? 403
              : 502;
            return Response.json(
              { error: result.error || "Fulfillment failed." },
              { status }
            );
          }

          return Response.json({
            success: true,
            providerOrderId: result.providerOrderId,
            trackingNumber: result.trackingNumber ?? null,
            status: result.status ?? "submitted",
            idempotent: result.idempotent ?? false,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to process payment.";
          return Response.json(
            { error: message },
            {
              status: /authentication|required|token/i.test(message) ? 401 : 502,
            }
          );
        }
      },
    },
  },
});
