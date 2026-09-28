import { requireAuthenticatedUser, AuthenticationError } from "@/lib/secure-core/auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, getMailMyPdfBaseUrl } from "@/lib/stripe.server";
import {
  toPublicSavedPaymentSummary,
  type SavedPaymentMethod,
} from "@mailmypdf/payment-fulfillment/saved-payment";

export class BillingProfileError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "BillingProfileError";
  }
}

function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "/dashboard";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 1024) {
    throw new BillingProfileError(400, "return_to must be a safe MailMyPDF path");
  }
  return path;
}

function setupUrl(returnTo?: string): string {
  const url = new URL("/account/setup", `${getMailMyPdfBaseUrl()}/`);
  if (returnTo) url.searchParams.set("return_to", safeReturnPath(returnTo));
  return url.toString();
}

function savedMethod(row: {
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  payment_brand: string | null;
  payment_last4: string | null;
  payment_ready: boolean;
  updated_at: string;
} | null): SavedPaymentMethod | null {
  if (!row?.stripe_customer_id || !row.default_payment_method_id) return null;
  return {
    provider: "stripe",
    customerRef: row.stripe_customer_id,
    paymentMethodRef: row.default_payment_method_id,
    brand: row.payment_brand ?? "",
    last4: row.payment_last4 ?? "",
    ready: row.payment_ready,
    updatedAt: row.updated_at,
  };
}

async function ownedProfile(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("account_billing_profiles")
    .select("owner_id, stripe_customer_id, default_payment_method_id, payment_brand, payment_last4, payment_ready, revision, updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new BillingProfileError(500, "Unable to load payment readiness");
  return data;
}

export async function getPaymentReadiness(request: Request, returnTo?: string) {
  const context = await requireAuthenticatedUser(request);
  const profile = await ownedProfile(context.user.id);
  return {
    accountReady: true,
    payment: toPublicSavedPaymentSummary(savedMethod(profile)),
    setupUrl: setupUrl(returnTo),
    chargingAuthorized: false,
    note:
      "A saved payment method only enables later payment. MailMyPDF still requires explicit approval of the exact document, recipients, mailing options, and price before any charge.",
  };
}

async function ensureStripeCustomer(ownerId: string, email: string) {
  const existing = await ownedProfile(ownerId);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const stripe = createStripeClient();
  const customer = await stripe.customers.create(
    { email, metadata: { mailmypdf_owner_id: ownerId } },
    { idempotencyKey: `mailmypdf_billing_customer_${ownerId}` },
  );

  const { error } = await supabaseAdmin.from("account_billing_profiles").upsert(
    {
      owner_id: ownerId,
      provider: "stripe",
      stripe_customer_id: customer.id,
      payment_ready: false,
      revision: existing?.revision ?? 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) throw new BillingProfileError(500, "Unable to save payment setup state");
  return customer.id;
}

export async function createPaymentSetupSession(
  request: Request,
  rawReturnTo?: unknown,
) {
  const context = await requireAuthenticatedUser(request);
  const email = context.user.email?.trim().toLowerCase();
  if (!email) throw new BillingProfileError(409, "A verified account email is required");

  const returnTo = safeReturnPath(rawReturnTo);
  const customerId = await ensureStripeCustomer(context.user.id, email);
  const baseUrl = getMailMyPdfBaseUrl();

  const success = new URL("/account/setup", `${baseUrl}/`);
  success.searchParams.set("setup", "success");
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  success.searchParams.set("return_to", returnTo);

  const cancel = new URL("/account/setup", `${baseUrl}/`);
  cancel.searchParams.set("setup", "cancelled");
  cancel.searchParams.set("return_to", returnTo);

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: success.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
    cancel_url: cancel.toString(),
    metadata: { mailmypdf_owner_id: context.user.id },
    setup_intent_data: {
      metadata: { mailmypdf_owner_id: context.user.id },
    },
  });

  if (!session.url) throw new BillingProfileError(502, "Stripe did not return a payment setup URL");
  return { setupUrl: session.url };
}

export async function syncPaymentSetupSession(
  request: Request,
  rawSessionId: unknown,
) {
  const context = await requireAuthenticatedUser(request);
  if (typeof rawSessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(rawSessionId)) {
    throw new BillingProfileError(400, "A valid Stripe Checkout session id is required");
  }

  const stripe = createStripeClient();
  const session = await stripe.checkout.sessions.retrieve(rawSessionId);
  if (
    session.mode !== "setup" ||
    session.metadata?.mailmypdf_owner_id !== context.user.id
  ) {
    throw new BillingProfileError(403, "This payment setup session does not belong to the connected account");
  }

  const profile = await ownedProfile(context.user.id);
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (!profile?.stripe_customer_id || !customerId || profile.stripe_customer_id !== customerId) {
    throw new BillingProfileError(409, "Payment setup customer identity changed");
  }

  const setupIntentId =
    typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id ?? null;
  if (!setupIntentId) throw new BillingProfileError(409, "Stripe payment setup is incomplete");

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (
    setupIntent.status !== "succeeded" ||
    setupIntent.metadata?.mailmypdf_owner_id !== context.user.id
  ) {
    throw new BillingProfileError(409, "Stripe payment setup has not completed");
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id ?? null;
  if (!paymentMethodId) throw new BillingProfileError(409, "Stripe did not return a saved payment method");

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const paymentMethodCustomer =
    typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id ?? null;
  if (paymentMethodCustomer !== customerId || paymentMethod.type !== "card" || !paymentMethod.card) {
    throw new BillingProfileError(409, "Saved payment method could not be verified");
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const nextRevision = (profile.revision ?? 0) + 1;
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("account_billing_profiles")
    .upsert(
      {
        owner_id: context.user.id,
        provider: "stripe",
        stripe_customer_id: customerId,
        default_payment_method_id: paymentMethodId,
        payment_brand: paymentMethod.card.brand,
        payment_last4: paymentMethod.card.last4,
        payment_ready: true,
        revision: nextRevision,
        updated_at: now,
      },
      { onConflict: "owner_id" },
    )
    .select("stripe_customer_id, default_payment_method_id, payment_brand, payment_last4, payment_ready, updated_at")
    .single();

  if (error || !data) throw new BillingProfileError(500, "Unable to save the verified payment method");

  return {
    payment: toPublicSavedPaymentSummary(savedMethod(data)),
    chargingAuthorized: false,
  };
}

export function billingErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (error instanceof BillingProfileError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Payment setup failed" }, { status: 500 });
}
