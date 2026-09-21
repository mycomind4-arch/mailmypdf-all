// Mounts the shared generic workflow-runtime contract (@mailmypdf/workflows)
// for every new root-level workflow UI (notice-respond, appeal-mail,
// records-request, ...) that talks to POST/GET/PATCH/DELETE
// /api/workflow-runtime/**. Routing within this tree — matters, documents,
// analysis, input, draft, packet, approval, checkout — is all handled by the
// shared request handler itself; see workflow-runtime-host.server.ts for the
// Supabase-backed adapters it runs against.
import { createFileRoute } from "@tanstack/react-router";
import { handleWorkflowRuntimeRequest } from "@/lib/secure-core/workflow-runtime-host.server";

export const Route = createFileRoute("/api/workflow-runtime/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleWorkflowRuntimeRequest(request),
      POST: ({ request }) => handleWorkflowRuntimeRequest(request),
      PATCH: ({ request }) => handleWorkflowRuntimeRequest(request),
      DELETE: ({ request }) => handleWorkflowRuntimeRequest(request),
    },
  },
});
