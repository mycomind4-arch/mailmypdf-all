import { createFileRoute } from "@tanstack/react-router";
import {
  reconcileInterruptedConnectorOperations,
  requireConnectorReconciliationAuthorization,
} from "@/lib/mcp/connector-operation-reconciliation.server";

export const Route = createFileRoute("/api/internal/reconcile-connector-operations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireConnectorReconciliationAuthorization(request);
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") ?? "50");
          const staleAfterMinutes = Number(
            url.searchParams.get("staleAfterMinutes") ?? "15",
          );
          const result = await reconcileInterruptedConnectorOperations({
            limit,
            staleAfterMinutes,
          });
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[connector-operation-reconciliation] job failed", error);
          return Response.json(
            { error: "Connector operation reconciliation failed" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
