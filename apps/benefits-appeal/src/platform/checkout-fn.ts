import { createServerFn } from "@tanstack/react-start";
import { isReadyToMail } from "@/domain/appeal";
import { loadAppeal } from "./appeal-repository";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  LABELS,
  type MailClass,
} from "@mailmypdf/pricing";

/* ─────────────────────────────────────────────
   Stripe checkout integration.
   Creates a checkout session only after the
   owner-scoped appeal passes the canonical
   readiness gate.

   Pricing is server-authoritative via the
   canonical @mailmypdf/pricing engine —
   no local price constants.
   ───────────────────────────────────────────── */

async function getStripe() {
  const { default: Stripe } = await import("stripe");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
}

export const createCheckoutSession = createServerFn()
  .validator((input: {
    mailingMethod: "standard" | "certified" | "registered";
    appealId: string;
    recipientName: string;
    workflowId: string;
    userId: string;
    pageCount?: number;
  }) => {
    if (!input.mailingMethod) {
      throw new Error("Invalid mailing method");
    }
    if (!input.appealId.trim()) {
      throw new Error("Appeal id is required");
    }
    if (!input.workflowId.trim()) {
      throw new Error("Workflow id is required");
    }
    if (!input.recipientName.trim()) {
      throw new Error("Recipient name is required");
    }
    if (!input.userId.trim()) {
      throw new Error("Owner identity is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const appeal = await loadAppeal({ data: { id: data.appealId, userId: data.userId } });

    if (appeal.workflowId !== data.workflowId) {
      throw new Error("Appeal workflow does not match checkout workflow");
    }

    if (!isReadyToMail(appeal)) {
      throw new Error("Appeal is not approved and readiness-validated for mailing");
    }

    // ── Canonical pricing — server-authoritative quote ──────────
    const profile = getWorkflowPricingProfile(data.workflowId);
    const actualPages = Math.max(1, data.pageCount || appeal.pageCount || 3);
    const mailClass = data.mailingMethod as MailClass;

    let quoteTotalCents: number;
    let lineItemName: string;
    let lineItemDescription: string;

    if (profile && profile.commercialStatus === "production") {
      const quote = calculateQuote({
        workflowId: data.workflowId,
        verticalId: "benefits-appeal",
        actualPages,
        mailClass,
      });
      quoteTotalCents = quote.totalCents;
      lineItemName = `Benefits Appeal — ${LABELS[data.mailingMethod]}`;
      lineItemDescription = `Workflow preparation ($${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[data.mailingMethod]}`;
    } else {
      // Fallback: mailing-only (should not happen for production workflows)
      quoteTotalCents = 0;
      lineItemName = LABELS[data.mailingMethod] || "Mailing";
      lineItemDescription = `Benefits Appeal — ${lineItemName} for ${data.recipientName}`;
    }

    const stripe = await getStripe();
    const appUrl = process.env.APP_URL || "https://benefits-appeal.pages.dev";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: lineItemName,
              description: lineItemDescription,
              metadata: {
                workflow_id: data.workflowId,
                appeal_id: data.appealId,
                mailing_method: data.mailingMethod,
              },
            },
            unit_amount: quoteTotalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appeal_id: data.appealId,
        workflow_id: data.workflowId,
        mailing_method: data.mailingMethod,
        recipient_name: data.recipientName,
        owner_user_id: data.userId,
        pricing_source: profile ? "canonical" : "fallback",
        quote_total_cents: String(quoteTotalCents),
        actual_pages: String(actualPages),
      },
      success_url: `${appUrl}/workflows/${data.workflowId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/workflows/${data.workflowId}?checkout=cancelled`,
    });

    return {
      sessionId: session.id,
      url: session.url,
      paymentStatus: session.payment_status,
    };
  });

export const verifyCheckoutSession = createServerFn()
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);

    return {
      paid: session.payment_status === "paid",
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      metadata: session.metadata,
    };
  });
