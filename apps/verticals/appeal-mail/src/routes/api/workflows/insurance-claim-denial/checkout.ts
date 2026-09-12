import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { calculateQuote, getWorkflowPricingProfileOrThrow, type MailClass } from "@mailmypdf/pricing";

const METHODS = new Set<MailClass>(["standard", "certified", "registered"]);

export const Route = createFileRoute("/api/workflows/insurance-claim-denial/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const input = await request.json() as { appealId?: string; mailingMethod?: MailClass };
          const appealId = input.appealId?.trim();
          const mailingMethod = input.mailingMethod;
          if (!appealId || !mailingMethod || !METHODS.has(mailingMethod)) return Response.json({ error: "A case and delivery method are required." }, { status: 400 });

          const s = await getSupabaseServer();
          const { data: a, error } = await s.from("appeals").select("id,user_id,workflow_id").eq("id", appealId).single();
          if (error || !a) return Response.json({ error: "Appeal case not found." }, { status: 404 });
          if (a.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
          if (a.workflow_id !== "insurance-claim-denial") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });
          // This is deliberately a pre-draft purchase. The final document is
          // not generated or mailed from checkout completion.
          const profile = getWorkflowPricingProfileOrThrow(a.workflow_id);
          const responsePages = profile.includedPages;
          const supportingPages = 0;
          const quote = calculateQuote({
            workflowId: "insurance-claim-denial",
            verticalId: "appeal-mail",
            actualPages: responsePages,
            supportingPages,
            mailClass: mailingMethod,
          });

          const { default: Stripe } = await import("stripe");
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
          const stripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
          const appUrl = process.env.APP_URL || "https://appeal-mail.pages.dev";

          const metadata = {
            payment_phase: "draft_unlock", appeal_id: a.id, workflow_id: a.workflow_id,
            owner_user_id: user.id, mailing_method: mailingMethod, quote_total_cents: String(quote.totalCents),
          };
          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_intent_data: { metadata },
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Insurance Claim Denial - drafting and mailing package",
                  description: `Drafting access plus ${mailingMethod} mailing; ${responsePages} response pages included.`,
                },
                unit_amount: quote.totalCents,
              },
              quantity: 1,
            }],
            metadata,
            success_url: `${appUrl}/workflows/insurance-claim-denial?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/workflows/insurance-claim-denial?checkout=cancelled`,
          }, { idempotencyKey: `insurance-draft-unlock:${a.id}:${mailingMethod}` });

          const { error: gateError } = await s.from("appeal_payment_gates").upsert({
            appeal_id: a.id, owner_id: user.id, workflow_id: a.workflow_id, status: "checkout_open",
            mailing_method: mailingMethod, quote_total_cents: quote.totalCents, quote_snapshot: quote,
            stripe_session_id: session.id, updated_at: new Date().toISOString(),
          }, { onConflict: "appeal_id" });
          if (gateError) throw new Error("Unable to save purchase state.");

          return Response.json({ ok: true, sessionId: session.id, url: session.url });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to create checkout session.";
          return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
        }
      },
    },
  },
});
