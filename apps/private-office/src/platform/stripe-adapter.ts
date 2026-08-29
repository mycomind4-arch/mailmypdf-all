/**
 * Stripe SDK adapter for Private Office.
 *
 * Wraps the `stripe` npm package. SERVER-ONLY — the Stripe secret key
 * is read from process.env and must NEVER be exposed to the client.
 *
 * Architecture:
 *   Checkout creation → StripeAdapter → Stripe API
 *   Webhook receipt  → StripeAdapter → Signature verification
 *
 * The adapter does NOT touch domain state. It only:
 * 1. Creates checkout sessions with server-authoritative pricing.
 * 2. Verifies webhook signatures.
 * 3. Retrieves payment intent status (for verification fallback).
 *
 * Payment verification and state transitions are handled by the
 * webhook handler and payment verification service.
 */

import Stripe from "stripe";

export interface CheckoutSessionInput {
  /** Server-authoritative amount in cents. */
  amount: number;
  /** ISO currency code (lowercase). */
  currency: string;
  /** Success redirect URL. */
  successUrl: string;
  /** Cancel redirect URL. */
  cancelUrl: string;
  /** Metadata binding the payment to the exact matter and owner. */
  metadata: {
    matterId: string;
    ownerId: string;
    workflowId: string;
  };
  /** Human-readable description for the Stripe checkout page. */
  description: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  sessionUrl: string;
  paymentIntentId: string | null;
}

export interface VerifiedWebhook {
  event: Stripe.Event;
}

export interface PaymentIntentResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export class StripeAdapter {
  private readonly client: Stripe;
  readonly provider = "stripe";

  constructor(config: { secretKey: string; apiVersion?: string }) {
    if (!config.secretKey.trim())
      throw new Error("Stripe secret key is required");
    this.client = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion ?? "2024-06-20") as Stripe.LatestApiVersion,
    });
  }

  /**
   * Create a Stripe Checkout Session with server-authoritative pricing.
   * The client cannot set the amount — it is derived from the workflow profile.
   */
  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: input.currency,
            unit_amount: input.amount,
            product_data: {
              name: input.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: input.metadata,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url ?? "",
      paymentIntentId: session.payment_intent as string | null,
    };
  }

  /**
   * Verify a Stripe webhook signature and construct the event.
   * Throws if the signature is invalid.
   */
  constructWebhookEvent(
    rawBody: string,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  /**
   * Retrieve a payment intent by ID.
   * Used as a verification fallback or for status checking.
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<PaymentIntentResult> {
    const intent = await this.client.paymentIntents.retrieve(paymentIntentId);
    return {
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
    };
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

let cachedAdapter: StripeAdapter | null = null;

/**
 * Returns the Stripe adapter if configured, or null.
 * The secret key is read from process.env.STRIPE_SECRET_KEY (server-only).
 */
export function getStripeAdapter(): StripeAdapter | null {
  if (cachedAdapter !== null) return cachedAdapter;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  cachedAdapter = new StripeAdapter({ secretKey });
  return cachedAdapter;
}

/**
 * Test-only: inject a custom adapter.
 */
export function _setStripeAdapter(adapter: StripeAdapter | null): void {
  cachedAdapter = adapter;
}

/**
 * Test-only: reset the cached adapter.
 */
export function _resetStripeAdapter(): void {
  cachedAdapter = null;
}
