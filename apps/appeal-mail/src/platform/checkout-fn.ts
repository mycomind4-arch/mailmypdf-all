import { createServerFn } from "@tanstack/react-start";
import { isReadyToMail } from "@/domain/appeal";
import { loadAppeal } from "./appeal-repository";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  serializeQuote,
  PRICES,
  LABELS,
  isValidPricingKey,
  type PricingKey,
  type MailClass,
} from "@mailmypdf/pricing";

/* ─────────────────────────────────────────────────────
   Stripe checkout integration.
   Creates a checkout session only after the
   owner-scoped appeal passes the canonical
   readiness gate.

   PRICING: Uses canonical @mailmypdf/pricing engine.
   The server resolves the workflow and calculates the
   full quote (preparation + mailing + extra pages).
   The client never controls price.
   ───────────────────────────────────────────────────── */

function estimatePageCount(draft: string): number {
  return Math.max(1, Math.ceil(draft.length / 3000));
}

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
    draftContent?: string;
  }) => {
    if (!input.mailingMethod || !isValidPricingKey(input.mailingMethod)) {
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

    const method = data.mailingMethod as PricingKey;
    const mailClass: MailClass = method as MailClass;
    const draftContent = data.draftContent || (appeal as any).draft || (appeal as any).packet?.draft || "";

    // ── Canonical pricing — server-authoritative quote ─────────
    const profile = getWorkflowPricingProfile(data.workflowId);
    let quoteTotalCents: number;
    let quoteSnapshot: string | null = null;
    let stripeLineItemName: string;
    let stripeLineItemDescription: string;

    if (profile && profile.commercialStatus === "production") {
      const actualPages = estimatePageCount(draftContent);
      const quote = calculateQuote({
        workflowId: data.workflowId,
        verticalId: profile.verticalId,
        actualPages,
        mailClass,
      });
      quoteTotalCents = quote.totalCents;
      quoteSnapshot = serializeQuote(quote);
      stripeLineItemName = `${data.recipientName} — ${LABELS[method]}`;
      stripeLineItemDescription = `Workflow preparation (${profile.band}: $${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[method]}${quote.extraPageCost > 0 ? ` + ${Math.max(0, actualPages - profile.includedPages)} extra pages` : ""}`;
    } else {
      // Fallback: use the appeal's packet pricing if available (appeal-mail has its own pricing)
      const packetTotal = (appeal as any)?.packet?.pricing?.total;
      if (packetTotal && Number.isFinite(packetTotal) && packetTotal > 0) {
        quoteTotalCents = Math.round(packetTotal * 100);
        stripeLineItemName = `Appeal Mail — ${LABELS[method]} for ${data.recipientName}`;
        stripeLineItemDescription = `Final approved packet — ${method} mailing`;
      } else {
        quoteTotalCents = PRICES[method];
        stripeLineItemName = LABELS[method];
        stripeLineItemDescription = `Appeal Mail — ${LABELS[method]} for ${data.recipientName}`;
      }
    }

    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: stripeLineItemName,
              description: stripeLineItemDescription,
              metadata: {
                workflow_id: data.workflowId,
                appeal_id: data.appealId,
                mailing_method: data.mailingMethod,
                pricing_source: profile ? "canonical" : "packet",
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
        quote_total_cents: String(quoteTotalCents),
        quote_snapshot: quoteSnapshot || "",
      },
      success_url: `${process.env.APP_URL || "https://appeal-mail.pages.dev"}/workflows/${data.workflowId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "https://appeal-mail.pages.dev"}/workflows/${data.workflowId}?checkout=cancelled`,
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
