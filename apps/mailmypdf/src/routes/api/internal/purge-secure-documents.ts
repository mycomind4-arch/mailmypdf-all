import { createFileRoute } from "@tanstack/react-router";
import {
  purgeExpiredSecureDocuments,
  requireRetentionAuthorization,
} from "@/lib/secure-core/retention.server";

export const Route = createFileRoute("/api/internal/purge-secure-documents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireRetentionAuthorization(request);
          const requested = Number(new URL(request.url).searchParams.get("limit") ?? "50");
          const result = await purgeExpiredSecureDocuments(requested);
          return Response.json(result, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[secure-document-retention] job failed", error);
          return Response.json({ error: "Retention job failed" }, {
            status: 500,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
