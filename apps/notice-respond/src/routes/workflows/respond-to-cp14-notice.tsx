import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/cp14-response */
export const Route = createFileRoute("/workflows/respond-to-cp14-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/cp14-response" }); },
  component: () => null,
});
