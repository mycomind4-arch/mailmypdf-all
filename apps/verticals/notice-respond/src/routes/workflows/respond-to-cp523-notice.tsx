import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/cp523-response */
export const Route = createFileRoute("/workflows/respond-to-cp523-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/cp523-response" }); },
  component: () => null,
});
