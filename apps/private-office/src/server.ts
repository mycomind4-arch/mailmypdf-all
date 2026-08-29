import { handleStripeWebhook } from "@/server/stripe-webhook-handler";
import { getStripeAdapter } from "@/platform/stripe-adapter";
import { supabasePaymentEvidenceRepository } from "@/services/supabase-payment-evidence-repository";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m: { default?: ServerEntry } | ServerEntry): ServerEntry => {
        const module = m as { default?: ServerEntry };
        return (module.default ?? (m as unknown as ServerEntry));
      },
    );
  }
  return serverEntryPromise;
}

const WEBHOOK_PATH = "/api/stripe/webhook";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) {
      const stripeAdapter = getStripeAdapter();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripeAdapter || !webhookSecret) {
        return Response.json(
          { error: "Stripe webhook handling is not configured" },
          { status: 503 },
        );
      }

      return handleStripeWebhook(request, {
        stripeAdapter,
        paymentEvidenceRepository: supabasePaymentEvidenceRepository,
        webhookSecret,
      });
    }

    const server = await getServerEntry();
    return server.fetch(request, env, ctx);
  },
};
