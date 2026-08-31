import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/agency-action */
export const Route = createFileRoute("/workflows/respond-to-an-agency-action")({
  beforeLoad: () => { throw redirect({ to: "/workflows/agency-action" }); },
  component: () => null,
});
