/**
 * A Mock Stripe provider for the workflow acceptance engine.
 *
 * Implements just enough of the `stripe` npm package's shape for the
 * checkout-session-create + webhook-signature-verify call sites used across
 * MailMyPDF verticals (`new Stripe(key, opts)`, `.checkout.sessions.create()`,
 * `.webhooks.constructEventAsync()`). No network call is ever made and no
 * real Stripe key is required -- see "Stripe Simulation Requirements" and
 * "Security Requirements" in docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
 *
 * Usage in a vertical's acceptance test (vitest):
 *
 *   const stripeMock = createStripeMock();
 *   vi.mock("stripe", () => ({ default: stripeMock.StripeCtor }));
 *   // ... drive the real checkout.ts route handler ...
 *   const event = stripeMock.buildCheckoutCompletedEvent(sessionId);
 *   // ... deliver `event` to the real webhook route handler, N times to
 *   // test idempotency ...
 */

export interface MockCheckoutSession {
  id: string;
  url: string;
  payment_status: "paid";
  amount_total: number;
  currency: string;
  payment_intent: string;
  metadata: Record<string, string>;
}

export interface StripeMock {
  StripeCtor: new (...args: unknown[]) => unknown;
  sessions: Map<string, MockCheckoutSession>;
  /** Total checkout.sessions.create() calls, across every `new Stripe()` instance. */
  checkoutCreateCalls: number;
  /** Total webhooks.constructEventAsync() calls (i.e. simulated webhook deliveries). */
  webhookDeliveries: number;
  buildCheckoutCompletedEvent(sessionId: string): {
    type: "checkout.session.completed";
    data: { object: MockCheckoutSession };
  };
  buildCheckoutExpiredEvent(sessionId: string): {
    type: "checkout.session.expired";
    data: { object: { id: string } };
  };
}

let sessionCounter = 0;
let paymentIntentCounter = 0;

export function createStripeMock(): StripeMock {
  const sessions = new Map<string, MockCheckoutSession>();
  const state: { checkoutCreateCalls: number; webhookDeliveries: number } = {
    checkoutCreateCalls: 0,
    webhookDeliveries: 0,
  };

  class MockStripe {
    checkout = {
      sessions: {
        create: async (params: any, _options?: unknown) => {
          state.checkoutCreateCalls += 1;
          sessionCounter += 1;
          const id = `cs_test_acceptance_${sessionCounter}`;
          const lineItem = params.line_items?.[0]?.price_data;
          const amount = lineItem?.unit_amount ?? 0;
          const currency = lineItem?.currency ?? "usd";
          paymentIntentCounter += 1;
          const session: MockCheckoutSession = {
            id,
            url: `https://checkout.stripe.test/mock/${id}`,
            payment_status: "paid",
            amount_total: amount,
            currency,
            payment_intent: `pi_test_acceptance_${paymentIntentCounter}`,
            metadata: { ...(params.metadata ?? {}) },
          };
          sessions.set(id, session);
          return session;
        },
      },
    };

    webhooks = {
      constructEventAsync: async (body: string, _signature: string, _secret: string) => {
        // The acceptance engine drives the webhook route directly with a
        // pre-built event (see buildCheckoutCompletedEvent below) rather than
        // a real HMAC-signed payload, so signature bytes are never checked --
        // that's Stripe SDK internals, not this vertical's fulfillment logic.
        // The body IS the JSON-serialized event the test constructed.
        state.webhookDeliveries += 1;
        return JSON.parse(body);
      },
    };
  }

  return {
    StripeCtor: MockStripe as unknown as new (...args: unknown[]) => unknown,
    sessions,
    get checkoutCreateCalls() {
      return state.checkoutCreateCalls;
    },
    get webhookDeliveries() {
      return state.webhookDeliveries;
    },
    buildCheckoutCompletedEvent(sessionId: string) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Mock Stripe: unknown checkout session ${sessionId}`);
      return { type: "checkout.session.completed" as const, data: { object: session } };
    },
    buildCheckoutExpiredEvent(sessionId: string) {
      return { type: "checkout.session.expired" as const, data: { object: { id: sessionId } } };
    },
  };
}
