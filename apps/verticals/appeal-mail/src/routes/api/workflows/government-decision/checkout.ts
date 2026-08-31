import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { calculateQuote, PRICES, LABELS, type MailClass } from "@mailmypdf/pricing";

export const Route = createFileRoute("/api/workflows/government-decision/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const input = await request.json() as any;
          if (!input.appealId?.trim()) return Response.json({ error: "Appeal id is required." }, { status: 400 });

          const s = await getSupabaseServer();
          const { data: a, error } = await s.from("appeals").select("*").eq("id", input.appealId).single();
          if (error || !a) return Response.json({ error: "Appeal case not found." }, { status: 404 });
          if (a.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
          if (a.workflow_id !== "government-decision") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });
          if (a.status !== "ready" || !a.review || !a.packet) return Response.json({ error: "Appeal is not approved and ready for payment." }, { status: 409 });

          const method = a.packet.mailingMethod;
          if (!PRICES[method]) return Response.json({ error: "Invalid mailing method." }, { status: 409 });

          // ── Canonical pricing — server-authoritative quote ──────────
          const responsePages = Math.max(1, Number(a.packet.responsePageCount || a.packet.responseSheets || a.packet.pageCount || 3));
          const supportingPages = Math.max(0, Number(a.packet.supportingPageCount || a.packet.supportingSheets || 0));
          const quote = calculateQuote({
            workflowId: "government-decision",
            verticalId: "appeal-mail",
            actualPages: responsePages,
            supportingPages,
            mailClass: method as MailClass,
          });

          const { default: Stripe } = await import("stripe");
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
          const stripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
          const appUrl = process.env.APP_URL || "https://appeal-mail.pages.dev";

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Government Decision Response Packet",
                  description: `${responsePages} response pages + ${supportingPages} supporting pages + ${LABELS[method]}`,
                },
                unit_amount: quote.totalCents,
              },
              quantity: 1,
            }],
            metadata: {
              appeal_id: a.id,
              workflow_id: "government-decision",
              mailing_method: method,
              response_pages: String(responsePages),
              supporting_pages: String(supportingPages),
              owner_user_id: user.id,
              pricing_source: "canonical",
              quote_total_cents: String(quote.totalCents),
            },
            success_url: `${appUrl}/workflows/government-decision?checkout=success&session_id=${encodeURIComponent("{CHECKOUT_SESSION_ID}")}`,
            cancel_url: `${appUrl}/workflows/government-decision?checkout=cancelled`,
          });

          return Response.json({ ok: true, sessionId: session.id, url: session.url });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to create checkout session.";
          return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
        }
      },
    },
  },
});
