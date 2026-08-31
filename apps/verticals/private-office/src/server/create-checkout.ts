/**
 * TanStack Start server function for checkout creation.
 *
 * This is a thin wrapper around the checkout service. It handles
 * authentication via accountAuthMiddleware and delegates the business
 * logic to the service module.
 *
 * The service module is separate so it can be tested without the
 * Supabase auth middleware dependency.
 */

import { createServerFn } from "@tanstack/react-start";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import {
  checkoutInputSchema,
  createCheckoutSessionInternal,
} from "@/services/checkout-service";
import { getStripeAdapter } from "@/platform/stripe-adapter";
import { supabasePaymentEvidenceRepository } from "@/services/supabase-payment-evidence-repository";
import { supabaseMatterRepository } from "@/services/supabase-matter-repository";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(checkoutInputSchema)
  .handler(async ({ data, context }) => {
    const user = context.user;
    const stripeAdapter = getStripeAdapter();
    if (!stripeAdapter)
      throw new Error("Stripe is not configured on the server.");

    return createCheckoutSessionInternal(user.id, data, {
      stripeAdapter,
      paymentEvidenceRepository: supabasePaymentEvidenceRepository,
      matterRepository: supabaseMatterRepository,
    });
  });
