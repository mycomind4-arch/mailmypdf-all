/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler for MailMyPDF Small Business.
 *
 * CRITICAL: This closes the security gap identified in the ecosystem audit.
 * Without this webhook, smallbusiness relied solely on the browser-return
 * path (checkout-return → /api/mail/response → /api/trigger-paid). If the
 * user closed their browser after paying, the payment was collected but
 * fulfillment never fired.
 *
 * This webhook:
 * - Verifies Stripe signature using the Stripe SDK
 * - Handles checkout.session.completed (payment success → queue fulfillment)
 * - Handles checkout.session.expired (mark intent expired)
 * - Handles charge.refunded (mark intent refunded)
 * - Is idempotent — checks intent status before queueing
 * - Uses Trigger.dev's idempotency key to prevent duplicate executions
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - TRIGGER_SECRET_KEY
 * - TRIGGER_API_URL (optional, defaults to https://api.trigger.dev)
 */

import { json } from "../../_auth";

type Env = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  TRIGGER_API_URL?: string;
  TRIGGER_SECRET_KEY?: string;
};

async function supabaseRest(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return json({ error: "Stripe webhook is not configured." }, 503);
    }

    // ── Read raw body (Stripe needs the raw body for signature verification) ──
    const rawBody = await request.text();

    // ── Get Stripe signature ───────────────────────────────────
    const signature = request.headers.get("stripe-signature") || request.headers.get("Stripe-Signature");
    if (!signature) {
      return json({ error: "Missing Stripe signature header." }, 400);
    }

    // ── Verify webhook signature using Stripe SDK ───────────────
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    });

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return json({
        error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`,
      }, 400);
    }

    // ── checkout.session.completed ────────────────────────────
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object as {
        id: string;
        payment_status?: string;
        payment_intent?: string | { id: string };
        metadata?: Record<string, string | undefined>;
      };

      if (session.payment_status !== "paid") {
        return json({ received: true, skipped: true, reason: `payment_status=${session.payment_status}` });
      }

      const intentId = session.metadata?.mailing_intent_id;
      if (!intentId) {
        return json({ received: true, skipped: true, reason: "no mailing_intent_id in metadata" });
      }

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      // ── Load the mailing intent ───────────────────────────────
      const intentResponse = await supabaseRest(
        env,
        `mailing_intents?id=eq.${encodeURIComponent(intentId)}&select=*`,
      );
      if (!intentResponse.ok) {
        return json({ error: "Unable to load mailing intent." }, 502);
      }
      const rows = await intentResponse.json() as Array<Record<string, unknown>>;
      const intent = rows[0];
      if (!intent) {
        return json({ error: "Mailing intent not found." }, 404);
      }

      // ── Idempotency: already queued/processing/mailed ────────
      const status = String(intent.status || "");
      if (status === "queued" || status === "processing" || status === "mailed" || status === "delivered") {
        return json({
          received: true,
          success: true,
          status,
          intentId,
          idempotent: true,
        });
      }

      // ── Mark as paid (atomic update with status guard) ────────
      const paymentIntentStr = paymentIntentId || null;
      const updateResponse = await supabaseRest(
        env,
        `mailing_intents?id=eq.${encodeURIComponent(intentId)}&status=eq.pending`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "paid",
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentStr,
            error_message: null,
          }),
        },
      );
      if (!updateResponse.ok) {
        // Maybe it was already updated by the browser-return path
        const recheck = await supabaseRest(env, `mailing_intents?id=eq.${encodeURIComponent(intentId)}&select=status`);
        const recheckRows = await recheck.json() as Array<Record<string, unknown>>;
        const recheckStatus = String(recheckRows[0]?.status || "");
        if (recheckStatus === "paid" || recheckStatus === "queued") {
          // Already handled by browser-return — fall through to queue
        } else {
          return json({ error: "Unable to record verified payment." }, 502);
        }
      }

      // ── Queue fulfillment via Trigger.dev ─────────────────────
      if (!env.TRIGGER_SECRET_KEY) {
        console.error("[stripe-webhook:smallbusiness] Trigger.dev is not configured — intent is paid but fulfillment cannot be queued.");
        return json({
          received: true,
          success: true,
          status: "paid",
          intentId,
          warning: "Fulfillment is not configured.",
        });
      }

      const workflowId = String(intent.workflow_id || "").trim();
      const triggerUrl = `${(env.TRIGGER_API_URL || "https://api.trigger.dev").replace(/\/$/, "")}/api/v1/tasks/${encodeURIComponent(workflowId)}/trigger`;
      const triggerResponse = await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.TRIGGER_SECRET_KEY}`,
        },
        body: JSON.stringify({
          payload: {
            mailingIntentId: intentId,
            businessId: intent.business_id,
            workflowId,
            mailJobId: intent.mail_job_id,
            stripeSessionId: session.id,
          },
          options: {
            idempotencyKey: `mailing-intent:${intentId}`,
          },
        }),
      });

      const triggerBody = await triggerResponse.text();
      if (!triggerResponse.ok) {
        console.error(`[stripe-webhook:smallbusiness] Trigger.dev rejected fulfillment for intent ${intentId}: ${triggerBody}`);
        // The payment is still verified — fulfillment can be retried
        return json({
          received: true,
          success: true,
          status: "paid",
          intentId,
          warning: "Fulfillment queueing failed — payment is verified and can be retried.",
        });
      }

      // ── Mark as queued ────────────────────────────────────────
      await supabaseRest(
        env,
        `mailing_intents?id=eq.${encodeURIComponent(intentId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "queued",
            trigger_response: triggerBody,
          }),
        },
      );

      return json({
        received: true,
        success: true,
        status: "queued",
        intentId,
        triggerQueued: true,
      });
    }

    // ── checkout.session.expired ──────────────────────────────
    if (stripeEvent.type === "checkout.session.expired") {
      const session = stripeEvent.data.object as { metadata?: Record<string, string | undefined> };
      const intentId = session.metadata?.mailing_intent_id;
      if (intentId) {
        await supabaseRest(
          env,
          `mailing_intents?id=eq.${encodeURIComponent(intentId)}&status=eq.pending`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "expired",
              error_message: "Stripe checkout session expired.",
            }),
          },
        );
      }
      return json({ received: true, handled: "checkout.session.expired" });
    }

    // ── charge.refunded ───────────────────────────────────────
    if (stripeEvent.type === "charge.refunded") {
      const charge = stripeEvent.data.object as { metadata?: Record<string, string | undefined> };
      const intentId = charge.metadata?.mailing_intent_id;
      if (intentId) {
        await supabaseRest(
          env,
          `mailing_intents?id=eq.${encodeURIComponent(intentId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "refunded",
              error_message: "Payment refunded by Stripe.",
            }),
          },
        );
      }
      return json({ received: true, handled: "charge.refunded" });
    }

    // ── Unhandled event type ───────────────────────────────────
    return json({ received: true, unhandled: stripeEvent.type });
  } catch (error) {
    console.error("[stripe-webhook:smallbusiness] Error:", error);
    return json({
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }, 500);
  }
};
