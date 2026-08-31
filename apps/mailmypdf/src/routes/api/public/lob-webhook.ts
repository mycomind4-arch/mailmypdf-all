// Lob dashboard test webhook endpoint: /api/public/lob-webhook.
import { createFileRoute } from "@tanstack/react-router";
import { processLobWebhook } from "@/lib/lob.server";

export const Route = createFileRoute("/api/public/lob-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => processLobWebhook(request),
    },
  },
});
