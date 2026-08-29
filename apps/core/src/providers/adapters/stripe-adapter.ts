/**
 * Stripe adapter — implements PaymentProvider using the Stripe SDK.
 *
 * Production-hardened:
 * - SDK-based webhook verification (constructEvent)
 * - Retry with exponential backoff on transient failures
 * - Timeout handling on all API calls
 * - Structured request logging
 * - Refund support with idempotency keys
 */

import Stripe from "stripe";
import { getConfig } from "@/config";
import { withRetry, type RetryOptions } from "@/lib/retry";
import { logRequest, logWebhook } from "@/lib/request-logging";
import {
  type PaymentProvider,
  type CheckoutSessionRequest,
  type CheckoutSessionResult,
  type RefundResult,
  type WebhookEvent,
  type PaymentEnvironment,
  type ProviderHealth,
} from "@/providers/interfaces";

let cachedClient: Stripe | null = null;

function getClient(): Stripe {
  if (cachedClient) return cachedClient;
  const config = getConfig();
  cachedClient = new Stripe(config.stripe.secretKey, {
    apiVersion: config.stripe.apiVersion as string as any,
  });
  return cachedClient;
}

const STRIPE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  timeoutMs: 15000,
  onRetry: (info) => {
    logRequest.retry({
      provider: "stripe",
      operation: "api_call",
      attempt: info.attempt,
      error: info.error,
      delayMs: info.delayMs,
    });
  },
};

export class StripeAdapter implements PaymentProvider {
  readonly name = "stripe";

  getEnvironment(): PaymentEnvironment {
    return getConfig().stripe.env;
  }

  isConfigured(): boolean {
    try {
      return !!getConfig().stripe.secretKey;
    } catch {
      return false;
    }
  }

  async createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResult> {
    const client = getClient();
    const reqCtx = logRequest.start({
      provider: "stripe",
      operation: "createCheckoutSession",
      orderId: req.orderId,
    });

    const session = await withRetry(async (attempt) => {
      try {
        const result = await client.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: req.currency,
                product_data: { name: "MailMyPDF — Print & Mail" },
                unit_amount: req.amountCents,
              },
              quantity: 1,
            },
          ],
          success_url: req.successUrl,
          cancel_url: req.cancelUrl,
          customer_email: req.customerEmail,
          metadata: { orderId: req.orderId, ...req.metadata },
        }, req.idempotencyKey ? { idempotencyKey: req.idempotencyKey } : undefined);

        logRequest.end(reqCtx, { status: 200, message: `checkout session created (attempt ${attempt})` });
        return result;
      } catch (e: any) {
        // Don't retry on client errors (400-level)
        const status = e?.statusCode ?? 0;
        if (status >= 400 && status < 500 && status !== 429) {
          logRequest.end(reqCtx, { status, message: `non-retryable error: ${e.message}`, error: e.message });
          throw e;
        }
        throw e;
      }
    }, STRIPE_RETRY_OPTIONS);

    return {
      id: session.id,
      url: session.url,
      paymentIntentId: session.payment_intent as string | undefined,
    };
  }

  async retrieveCheckoutSession(sessionId: string) {
    const client = getClient();
    const reqCtx = logRequest.start({
      provider: "stripe",
      operation: "retrieveCheckoutSession",
    });

    const session = await withRetry(async (attempt) => {
      try {
        const result = await client.checkout.sessions.retrieve(sessionId);
        logRequest.end(reqCtx, { status: 200, message: `session retrieved (attempt ${attempt})` });
        return result;
      } catch (e: any) {
        const status = e?.statusCode ?? 0;
        if (status >= 400 && status < 500 && status !== 429) {
          logRequest.end(reqCtx, { status, message: `non-retryable: ${e.message}`, error: e.message });
          throw e;
        }
        throw e;
      }
    }, STRIPE_RETRY_OPTIONS);

    return {
      id: session.id,
      paymentStatus: session.payment_status,
      paymentIntentId: session.payment_intent as string | undefined,
      metadata: session.metadata ?? undefined,
    };
  }

  async createRefund(paymentIntentId: string, amountCents?: number): Promise<RefundResult> {
    const client = getClient();
    const reqCtx = logRequest.start({
      provider: "stripe",
      operation: "createRefund",
    });

    const refund = await withRetry(async (attempt) => {
      try {
        const result = await client.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
        }, {
          idempotencyKey: `refund_${paymentIntentId}_${amountCents ?? "full"}`,
        });
        logRequest.end(reqCtx, { status: 200, message: `refund created (attempt ${attempt})` });
        return result;
      } catch (e: any) {
        const status = e?.statusCode ?? 0;
        if (status >= 400 && status < 500 && status !== 429) {
          logRequest.end(reqCtx, { status, message: `non-retryable: ${e.message}`, error: e.message });
          throw e;
        }
        throw e;
      }
    }, STRIPE_RETRY_OPTIONS);

    return {
      id: refund.id,
      amountCents: refund.amount,
      status: refund.status ?? "unknown",
    };
  }

  async verifyWebhook(req: Request): Promise<WebhookEvent> {
    const config = getConfig();
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const secret = config.stripe.webhookSecret;

    if (!signature || !body) throw new Error("Missing signature or body");

    const client = getClient();
    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(body, signature, secret);
    } catch (e) {
      logWebhook({
        provider: "stripe",
        eventType: "verification_failed",
        message: `signature verification failed: ${e instanceof Error ? e.message : String(e)}`,
        level: "error",
      });
      throw new Error(`Webhook signature verification failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    logWebhook({
      provider: "stripe",
      eventType: event.type,
      externalId: event.id,
      message: "webhook verified",
      level: "info",
    });

    return {
      type: event.type,
      id: event.id,
      data: {
        object: event.data.object as unknown as Record<string, unknown>,
      },
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return { status: "down", message: "Stripe API key not configured", lastCheckedAt: new Date().toISOString() };
    }
    try {
      const client = getClient();
      await withRetry(async () => {
        await client.balance.retrieve();
      }, { maxAttempts: 1, timeoutMs: 5000 });
      return { status: "healthy", lastCheckedAt: new Date().toISOString() };
    } catch (e) {
      return {
        status: "degraded",
        message: e instanceof Error ? e.message : "Stripe API error",
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }
}
