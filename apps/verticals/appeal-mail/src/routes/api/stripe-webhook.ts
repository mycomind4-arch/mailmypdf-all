import { paymentSessionError } from '@/platform/payment-session';
import { createFileRoute } from "@tanstack/react-router";
import { fulfillMailingIntent } from "@mailmypdf/payment-fulfillment";
import { createAppealMailIntentStore } from "@/platform/mailing-intent-store";
import { mailMyPDFClient } from "@/platform/mailmypdf-client";

/**
 * Appeal Mail's Stripe webhook.
 *
 * Fulfillment now runs through the canonical @mailmypdf/payment-fulfillment
 * engine for EVERY workflow — not the 5 that used to be hardcoded here.
 * Every one of Appeal Mail's 25 workflows produces an appeal with a
 * `packet` (see domain/packet.ts: assemblePacket, called from every
 * workflow's approve.ts). The store reports "no intent" for any appeal
 * without a complete packet, so this fails closed rather than silently
 * skipping mailing.
 *
 * fulfillMailingIntent() is idempotent (checks provider_order_id before
 * resubmitting) and verifies the stored draft/recipient against the
 * approval-time hashes before it will submit anything to MailMyPDF.
 *
 */
const store = createAppealMailIntentStore();

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { default: Stripe } = await import("stripe");
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const signature = request.headers.get("stripe-signature");

        if (!stripeSecretKey || !webhookSecret) {
          return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
        }
        if (!signature) {
          return Response.json({ error: "Missing Stripe signature header." }, { status: 400 });
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
        const body = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        } catch (err) {
          return Response.json(
            { error: `Webhook signature verification failed: ${(err as Error).message}` },
            { status: 400 },
          );
        }

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status !== "paid") return Response.json({ received: true, skipped: true });
          const appealId = session.metadata?.appeal_id;
          if (!appealId) {
            console.error("[stripe-webhook:appeal-mail] checkout.session.completed with no appeal_id in metadata.");
            return Response.json({ received: true, skipped: true }, { status: 200 });
          }

          const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

          try {
            const validationError = paymentSessionError(session, await store.load(appealId));
            if (validationError) return Response.json({ error: validationError }, { status: 409 });
            const result = await fulfillMailingIntent(
              store,
              mailMyPDFClient,
              appealId,
              session.id,
              paymentIntentId,
              "stripe-webhook",
              "appeal-mail",
            );
            if (!result.success) {
              console.error(`[stripe-webhook:appeal-mail] Fulfillment failed for appeal ${appealId}: ${result.error}`);
              return Response.json({ error: "Fulfillment failed. Please retry." }, { status: 500 });
            } else {
              console.log(
                `[stripe-webhook:appeal-mail] Fulfilled appeal ${appealId} -> ${result.providerOrderId ?? "(pending)"} (${result.status ?? "unknown"}${result.idempotent ? ", idempotent replay" : ""})`,
              );
            }
          } catch (err) {
            console.error(`[stripe-webhook:appeal-mail] Fulfillment threw for appeal ${appealId}:`, err);
            return Response.json({ error: "Fulfillment failed. Please retry." }, { status: 500 });
          }

          return Response.json({ received: true }, { status: 200 });
        }

        try {
          if (event.type === "checkout.session.expired") {
            const session = event.data.object as Stripe.Checkout.Session;
            const intent = await store.loadByStripeSession(session.id);
            if (intent && intent.status === "approved" && !intent.provider_order_id) {
              await store.updateStatus(intent.id, { status: "expired", error_message: "Stripe checkout session expired." });
            }
          } else if (event.type === "charge.refunded") {
            const charge = event.data.object as Stripe.Charge;
            const appealId = charge.metadata?.appeal_id;
            const intent = appealId ? await store.load(appealId) : null;
            const paymentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
            if (intent && charge.refunded && paymentId === intent.stripe_payment_intent_id) {
              await store.updateStatus(intent.id, { status: "refunded", error_message: "Payment refunded by Stripe." });
            }
          }
        } catch (error) {
          console.error("[stripe-webhook:appeal-mail] Status update failed", error);
          return Response.json({ error: "Unable to persist payment status." }, { status: 500 });
        }

        return Response.json({ received: true }, { status: 200 });
      },
    },
  },
});
