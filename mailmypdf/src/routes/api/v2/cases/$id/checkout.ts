import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  assertRecipient,
  materializeApprovedPacket,
} from "@/lib/secure-core/case-approval.server";
import {
  createOrLoadOrder,
  ensureCheckoutSession,
} from "@/lib/secure-core/workflow-checkout.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";
import { getStripeErrorMessage } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/v2/cases/$id/checkout")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });

          const context = await requireAuthenticatedUser(request);
          if (!context.user.email) {
            return json(400, { error: "A verified account email is required for payment receipts." });
          }

          const body = await readJson(request);
          const approvalId = typeof body.approval_id === "string" ? body.approval_id : "";
          if (!UUID_PATTERN.test(approvalId)) {
            return json(400, { error: "A valid approval ID is required." });
          }

          const sender = assertRecipient(body.sender);
          const packet = await materializeApprovedPacket(params.id, approvalId, context);

          const order = await createOrLoadOrder({
            caseId: params.id,
            approvalId,
            sender,
            userId: context.user.id,
            email: context.user.email,
            packet,
          });

          const checkout = await ensureCheckoutSession({
            order,
            approvalId,
            caseId: params.id,
            workflowId: packet.workflowId,
            email: context.user.email,
          });

          return json(200, {
            order_id: order.id,
            order_token: order.lookup_token,
            checkout_url: checkout.checkoutUrl,
            stripe_session_id: checkout.sessionId,
            total_cents: packet.quote.totalCents,
            packet_sha256: packet.packetSha256,
          });
        } catch (error) {
          if (error && typeof error === "object" && "type" in error) {
            return json(502, { error: getStripeErrorMessage(error) });
          }
          return errorResponse("case-checkout", error);
        }
      },
    },
  },
});
