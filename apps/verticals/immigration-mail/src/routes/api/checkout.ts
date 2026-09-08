/**
 * POST /api/checkout
 *
 * Creates an authenticated Stripe Checkout Session for a mailing intent.
 *
 * SECURITY: Requires a server-side approval reference. The draft and
 * recipient are loaded from the immutable approval record, NOT from
 * client-supplied values. This closes the approval-bypass gap.
 *
 * PRICING: Uses the canonical @mailmypdf/pricing engine to calculate
 * the full quote (workflow preparation fee + mailing service + extra pages).
 * The server resolves the workflow and calculates the amount — the client
 * never controls price.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
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

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

          const input = (await request.json()) as {
            approvalId?: string;
            workflowId?: string;
            workflowTitle?: string;
            correspondenceId?: string;
            mailingMethod?: string;
            matterReference?: string;
            matterType?: string;
            legalReference?: unknown;
          };

          const approvalId = input?.approvalId?.trim();
          const workflowId = input?.workflowId?.trim();
          const methodRaw = input?.mailingMethod;

          if (!approvalId) {
            return Response.json(
              {
                error: "Server-side approval is required before checkout. Call /api/approve first.",
              },
              { status: 400 }
            );
          }
          if (!workflowId) {
            return Response.json({ error: "Workflow ID is required." }, { status: 400 });
          }
          if (!methodRaw || !isValidPricingKey(methodRaw)) {
            return Response.json({ error: "Invalid mailing method." }, { status: 400 });
          }

          const method = methodRaw as PricingKey;
          const mailClass: MailClass = method as MailClass;
          const supabase = serviceSupabase();

          const { data: approval, error: approvalError } = await supabase
            .from("approvals")
            .select(
              "id, user_id, case_id, workflow_id, draft_content, recipient, draft_hash, recipient_hash, status, approved_at"
            )
            .eq("id", approvalId)
            .eq("user_id", user.id)
            .eq("status", "active")
            .single();

          if (approvalError || !approval) {
            return Response.json(
              {
                error: "Approval record not found, revoked, or not owned by the authenticated user.",
              },
              { status: 404 }
            );
          }
          if (approval.workflow_id !== workflowId) {
            return Response.json(
              { error: "Approval does not match the requested workflow." },
              { status: 409 }
            );
          }

          const draft = approval.draft_content as string;
          const recipient = approval.recipient as {
            name?: string;
            org?: string;
            address1?: string;
            address2?: string;
            city?: string;
            state?: string;
            zip?: string;
          };

          if (!draft || draft.length < 20) {
            return Response.json(
              { error: "Approved draft is invalid." },
              { status: 409 }
            );
          }
          if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) {
            return Response.json(
              { error: "Approved recipient is incomplete." },
              { status: 409 }
            );
          }
          if (!/^[A-Za-z]{2}$/.test(recipient.state)) {
            return Response.json(
              { error: "Approved recipient state is invalid." },
              { status: 409 }
            );
          }
          if (!/^\d{5}(-\d{4})?$/.test(recipient.zip)) {
            return Response.json(
              { error: "Approved recipient ZIP code is invalid." },
              { status: 409 }
            );
          }

          // ── Canonical pricing — server-authoritative quote ─────────
          const profile = getWorkflowPricingProfile(workflowId);
          let quoteTotalCents: number;
          let quoteSnapshot: string | null = null;
          let stripeLineItemName: string;
          let stripeLineItemDescription: string;

          if (profile && profile.commercialStatus === "production") {
            const actualPages = estimatePageCount(draft);
            const quote = calculateQuote({
              workflowId,
              verticalId: profile.verticalId,
              actualPages,
              mailClass,
            });
            quoteTotalCents = quote.totalCents;
            quoteSnapshot = serializeQuote(quote);

            const workflowTitle = input?.workflowTitle?.trim() || workflowId;
            stripeLineItemName = `${workflowTitle} — ${LABELS[method]}`;
            stripeLineItemDescription = `Workflow preparation (${profile.band}: $${(quote.basePriceCents / 100).toFixed(2)}) + ${LABELS[method]}${quote.extraPageCost > 0 ? ` + ${Math.max(0, actualPages - profile.includedPages)} extra pages` : ""}`;
          } else {
            quoteTotalCents = PRICES[method];
            stripeLineItemName = LABELS[method];
            stripeLineItemDescription = `${input?.workflowTitle?.trim() || workflowId} · ${LABELS[method]}`;
          }

          const secretKey = process.env.STRIPE_SECRET_KEY;
          if (!secretKey) {
            return Response.json({ error: "Stripe is not configured." }, { status: 503 });
          }
          const { default: Stripe } = await import("stripe");
          const stripe = new Stripe(secretKey, {
            apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
          });
          const appUrl =
            process.env.APP_URL || new URL(request.url).origin;

          const { data: intent, error: intentError } = await supabase
            .from("mailing_intents")
            .insert({
              user_id: user.id,
              workflow_id: workflowId,
              correspondence_id: input?.correspondenceId || null,
              status: "pending",
              mailing_method: method,
              draft_content: draft,
              recipient,
              matter_reference: input?.matterReference?.trim() || workflowId,
              matter_type: input?.matterType?.trim() || "immigration-mail",
              legal_reference: input?.legalReference || null,
              approval_id: approvalId,
              approved_draft_hash: approval.draft_hash,
              approved_recipient_hash: approval.recipient_hash,
              quote_snapshot: quoteSnapshot,
            })
            .select("id")
            .single();

          if (intentError || !intent) {
            return Response.json(
              {
                error: `Unable to create mailing intent: ${
                  intentError?.message || "unknown error"
                }`,
              },
              { status: 502 }
            );
          }

          try {
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
                    },
                    unit_amount: quoteTotalCents,
                  },
                  quantity: 1,
                },
              ],
              metadata: {
                mailing_intent_id: intent.id,
                owner_user_id: user.id,
                workflow_id: workflowId,
                approval_id: approvalId,
                quote_total_cents: String(quoteTotalCents),
                pricing_source: profile ? "canonical" : "mailing-only",
              },
              success_url: `${appUrl}/workflows/${workflowId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${appUrl}/workflows/${workflowId}?checkout=cancelled`,
            });
            const { error: updateError } = await supabase
              .from("mailing_intents")
              .update({ stripe_session_id: session.id })
              .eq("id", intent.id)
              .eq("user_id", user.id);
            if (updateError) throw updateError;
            return Response.json({
              ok: true,
              checkoutUrl: session.url,
              sessionId: session.id,
            });
          } catch (error) {
            await supabase
              .from("mailing_intents")
              .update({
                status: "failed",
                error_message:
                  error instanceof Error
                    ? error.message
                    : "Stripe checkout creation failed",
              })
              .eq("id", intent.id)
              .eq("user_id", user.id);
            throw error;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to create checkout session.";
          return Response.json(
            { error: message },
            {
              status: /authentication|required|token/i.test(message) ? 401 : 502,
            }
          );
        }
      },
    },
  },
});
