import { createFileRoute } from "@tanstack/react-router";
import {
  requireScannerAuthorization,
  scanQuarantinedDocuments,
} from "@/lib/secure-core/scanner.server";

export const Route = createFileRoute("/api/internal/scan-documents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireScannerAuthorization(request);
          const requested = Number(new URL(request.url).searchParams.get("limit") ?? "10");
          const result = await scanQuarantinedDocuments(requested);
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[secure-document-scanner] job failed", error);
          return Response.json({ error: "Scanner job failed" }, {
            status: 500,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
