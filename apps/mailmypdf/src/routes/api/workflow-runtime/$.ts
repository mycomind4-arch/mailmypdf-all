import { createFileRoute } from "@tanstack/react-router";
import { createPlatformWorkflowRuntimeRequestHandler } from "@mailmypdf/workflows";
import { createWorkflowRuntimeHostDependencies } from "@/lib/secure-core/workflow-runtime-host.server";

// Framework-independent shared runtime host, mounted at /api/workflow-runtime.
// Workflow identity and policy selection come entirely from the shared
// platform registry (`platformWorkflowRuntimePolicyFor`, composed inside
// `createPlatformWorkflowRuntimeRequestHandler`) — this route supplies only
// deployment adapters (auth, persistence, documents, AI, packet, checkout)
// and never hard-codes which workflow ids are allowed to run.
const handleWorkflowRuntimeRequest = createPlatformWorkflowRuntimeRequestHandler(
  createWorkflowRuntimeHostDependencies(),
  { basePath: "/api/workflow-runtime" },
);

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
