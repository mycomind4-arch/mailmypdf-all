import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /workflows → /workflows/ (redirect to the unified Workflow Hub)
 *
 * The Workflow Hub is now the primary discovery interface for authenticated users
 * across the entire MailMyPDF ecosystem.
 */
export const Route = createFileRoute("/workflows")({
  beforeLoad: () => {
    throw redirect({ to: "/workflows/" });
  },
  component: () => null,
});
