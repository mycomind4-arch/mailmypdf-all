import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { calculateQuote, getWorkflowPricingProfile, LABELS, type MailClass } from "@mailmypdf/pricing";

/**
 * POST /api/checkout
 *
 * Creates a Stripe checkout session for a dispute mailing.
 * Uses the canonical @mailmypdf/pricing engine for server-authoritative pricing.
 */

function estimatePageCount(draft: string): number {
  return Math.max(1, Math.ceil(draft.length / 3000));
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const input = await request.json() as {
            draftContent?: string;
            workflowId?: string;
            workflowTitle?: string;
            mailingMethod?: string;
            recipient?: Record<string, unknown>;
            caseId?: string | null;
            documentId?: string;
          };

          if (!input.draftContent || input.draftContent.trim().length < 20) {
            return Response.json({ error: "A completed draft is required." }, { status: 400 });
          }
          if (!input.workflowId?.trim()) {
            return Response.json({ error: "Workflow ID is required." }, { status: 400 });
          }
          if (!input.mailingMethod || !["standard", "certified", "registered"].includes(input.mailingMethod)) {
            return Response.json({ error: "A valid mailing method is required." }, { status: 400 });
          }
          if (!input.recipient || !String(input.recipient.name || "").trim()) {
            return Response.json({ error: "A recipient is required." }, { status: 400 });
          }

          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return Response.json({ error: "Stripe is not configured." }, { status: 503 });

          // ── Canonical pricing — server-authoritative quote ──────────
          const profile = getWorkflowPricingProfile(input.workflowId);
          const actualPages = estimatePageCount(input.draftContent);
          const mailClass = input.mailingMethod as MailClass;

          let quoteTotalCents: number;
          let lineItemName: string;
          let lineItemDescription: string;

          if (profile && profile.commercialStatus === "production") {
            const quote = calculateQuote({
              workflowId: input.workflowId,
              verticalId: "dispute-mail",
              actualPages,
              mailClass,
            });
            quoteTotalCents = quote.totalCents;
            lineItemName = `${input.workflowTitle || input.workflowId} — ${LABELS[mailClass]}`;
            lineItemDescription = `Workflow preparation ($${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[mailClass]}`;
          } else {
            quoteTotalCents = 0;
            lineItemName = input.workflowTitle || input.workflowId;
            lineItemDescription = `Dispute letter — ${LABELS[mailClass] || "Standard mailing"}`;
          }

          const { default: Stripe } = await import("stripe");
          const stripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
          const appUrl = process.env.APP_URL || new URL(request.url).origin;

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: {
                  name: lineItemName,
                  description: lineItemDescription,
                },
                unit_amount: quoteTotalCents,
              },
              quantity: 1,
            }],
            metadata: {
              workflow_id: input.workflowId,
              case_id: input.caseId || "",
              mailing_method: input.mailingMethod,
              owner_user_id: user.id,
              pricing_source: profile ? "canonical" : "fallback",
              quote_total_cents: String(quoteTotalCents),
              actual_pages: String(actualPages),
            },
            success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/?checkout=cancelled`,
          });

          return Response.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to create checkout session.";
          return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
        }
      },
    },
  },
});
