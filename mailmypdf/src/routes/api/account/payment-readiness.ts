import { createFileRoute } from "@tanstack/react-router";
import { billingErrorResponse, getPaymentReadiness } from "@/lib/billing-profile.server";

export const Route = createFileRoute("/api/account/payment-readiness")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          return Response.json(
            await getPaymentReadiness(request, url.searchParams.get("return_to") ?? undefined),
          );
        } catch (error) {
          return billingErrorResponse(error);
        }
      },
    },
  },
});
