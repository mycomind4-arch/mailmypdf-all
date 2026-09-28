import { createFileRoute } from "@tanstack/react-router";
import { billingErrorResponse, syncPaymentSetupSession } from "@/lib/billing-profile.server";

export const Route = createFileRoute("/api/account/payment-setup/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({})) as Record<string, unknown>;
          return Response.json(await syncPaymentSetupSession(request, body.session_id));
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
