import { createFileRoute } from "@tanstack/react-router";
import { handleControlPlaneRequest } from "@/platform/control-plane-logic";

/* ═══════════════════════════════════════════════════════════
   MailMyPDF Control Plane — AI Configuration Resolver

   Self-hosted control plane endpoint that serves the existing
   MailMyPDF platform contract:

     POST /api/control-plane/ai
     Authorization: Bearer <MAILMYPDF_CONTROL_PLANE_TOKEN>
     { verticalSlug, workflowSlug, task }

   Returns:
     { provider, apiKey, model, promptOverride? }

   The control plane reads AI provider credentials from
   environment variables and returns configuration to the
   calling vertical app.  All communication is server-side;
   the token and API keys never reach the client bundle.

   Currently configured for Google Gemini (provider: "gemini")
   as required by all Benefits Appeal workflow routes.
   ═══════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/api/control-plane/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => handleControlPlaneRequest(request),
    },
  },
});
