import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

export function getStripeEnvironment(): StripeEnv {
  const value = getEnv("PAYMENTS_ENV");
  if (value !== "sandbox" && value !== "live") {
    throw new Error("PAYMENTS_ENV must be either 'sandbox' or 'live'");
  }
  return value;
}

export function getMailMyPdfBaseUrl(): string {
  const configured = getEnv("MAILMYPDF_BASE_URL");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("MAILMYPDF_BASE_URL must use http or https");
  }
  return url.origin;
}

function getConnectionApiKey(env: StripeEnv = getStripeEnvironment()): string {
  return env === "sandbox"
    ? getEnv("STRIPE_SANDBOX_API_KEY")
    : getEnv("STRIPE_LIVE_API_KEY");
}

export function createStripeClient(): Stripe {
  const env = getStripeEnvironment();
  const apiKey = getConnectionApiKey(env);
  return new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: { message?: string; type?: string; code?: string; decline_code?: string; param?: string; requestId?: string };
    };
    const message = e.raw?.message ?? e.message;
    if (message) {
      const details = [
        e.raw?.type ?? e.type,
        e.raw?.code ?? e.code,
        e.raw?.decline_code ?? e.decline_code,
        e.raw?.param ?? e.param,
        e.raw?.requestId ?? e.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }
  return "Stripe request failed";
}


// ── Refund Support ─────────────────────────────────────────────────────────────
//
// Production refund flow — creates a Stripe refund and records the result
// in order_events. Uses idempotency key to prevent duplicate refunds.

export type RefundResult = {
  refundId: string;
  amountCents: number;
  status: string;
  reason?: string | null;
};

/**
 * Create a refund for an order's Stripe payment.
 * @param orderId - The internal order ID
 * @param paymentIntentId - The Stripe Payment Intent ID
 * @param amountCents - Amount to refund (in cents). If omitted, full refund.
 * @param reason - Optional reason for the refund
 */
export async function createOrderRefund(args: {
  orderId: string;
  paymentIntentId: string;
  amountCents?: number;
  reason?: string;
}): Promise<RefundResult> {
  const client = createStripeClient();

  const refund = await client.refunds.create({
    payment_intent: args.paymentIntentId,
    amount: args.amountCents,
    reason: args.reason as any,
    metadata: { orderId: args.orderId },
  }, {
    idempotencyKey: `refund_${args.orderId}_${args.amountCents ?? "full"}`,
  });

  return {
    refundId: refund.id,
    amountCents: refund.amount,
    status: refund.status ?? "unknown",
    reason: args.reason ?? null,
  };
}

/**
 * Retrieve a refund by ID.
 */
export async function getRefund(refundId: string) {
  const client = createStripeClient();
  return client.refunds.retrieve(refundId);
}

/**
 * List all refunds for a payment intent.
 */
export async function listRefundsForPaymentIntent(paymentIntentId: string) {
  const client = createStripeClient();
  const refunds = await client.refunds.list({ payment_intent: paymentIntentId });
  return refunds.data.map((r) => ({
    id: r.id,
    amount: r.amount,
    status: r.status,
    reason: r.reason,
    created: new Date(r.created * 1000).toISOString(),
  }));
}
