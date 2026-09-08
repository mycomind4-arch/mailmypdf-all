import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { PRICES, LABELS } from "@mailmypdf/pricing";
import { calculateSsdiDenialTotal } from "@/domain/ssdi-denial-pricing";

export const Route = createFileRoute("/api/workflows/ssdi-denial/checkout")({
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
          if (a.workflow_id !== "ssdi-denial") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });
          if (a.status !== "ready" || !a.review || !a.packet) return Response.json({ error: "Appeal is not approved and ready for payment." }, { status: 409 });

          if (!a.packet.id || !a.packet.approvedDraftHash || !a.packet.approvedRecipientHash) return Response.json({ error: "Please approve the packet again before checkout." }, { status: 409 });
          const method = a.packet.mailingMethod;
          if (!PRICES[method]) return Response.json({ error: "Invalid mailing method." }, { status: 409 });

          // Charge exactly what approve.ts computed and stored on the
          // approved packet (via calculateSsdiDenialTotal — this workflow's
          // own local pricing model), not a freshly recomputed canonical
          // quote: those two are different numbers (this workflow's
          // preparationFee is $24.99, not the canonical "ssdi-denial"
          // profile's $69.99), and the amount charged must match what the
          // user actually approved.
          const responsePages = Math.max(1, Number(a.packet.responseSheets || a.packet.pageCount || 3));
          const supportingPages = Math.max(0, Number(a.packet.supportingSheets || 0));
          const pricing = a.packet.pricing ?? calculateSsdiDenialTotal({
            responseSheets: responsePages,
            supportingSheets: supportingPages,
            mailingMethod: method as "standard" | "certified" | "registered",
          });
          const totalCents = Math.round(pricing.total * 100);

          const { default: Stripe } = await import("stripe");
          const key = process.env.STRIPE_SECRET_KEY;
          if (!key) return Response.json({ error: "Stripe is not configured." }, { status: 503 });
          const stripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
          const appUrl = process.env.APP_URL || "https://appeal-mail.pages.dev";

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_intent_data: { metadata: { appeal_id: a.id, workflow_id: a.workflow_id, owner_user_id: user.id } },
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "usd",
                product_data: {
                  name: "SSDI Denial Appeal Packet",
                  description: `${responsePages} response pages + ${supportingPages} supporting pages + ${LABELS[method]}`,
                },
                unit_amount: totalCents,
              },
              quantity: 1,
            }],
            metadata: {
              appeal_id: a.id,
              packet_id: a.packet.id,
              approved_draft_hash: a.packet.approvedDraftHash,
              approved_recipient_hash: a.packet.approvedRecipientHash,
              workflow_id: "ssdi-denial",
              mailing_method: method,
              response_pages: String(responsePages),
              supporting_pages: String(supportingPages),
              owner_user_id: user.id,
              pricing_source: "approved-packet",
              quote_total_cents: String(totalCents),
            },
            success_url: `${appUrl}/workflows/ssdi-denial?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/workflows/ssdi-denial?checkout=cancelled`,
          }, { idempotencyKey: `appeal-checkout:${a.id}:${a.packet.id}` });

          return Response.json({ ok: true, sessionId: session.id, url: session.url });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to create checkout session.";
          return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
        }
      },
    },
  },
});
