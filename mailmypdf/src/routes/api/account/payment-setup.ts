import { createFileRoute } from "@tanstack/react-router";
import { billingErrorResponse, createPaymentSetupSession } from "@/lib/billing-profile.server";

export const Route = createFileRoute("/api/account/payment-setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({})) as Record<string, unknown>;
          return Response.json(await createPaymentSetupSession(request, body.return_to));
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
