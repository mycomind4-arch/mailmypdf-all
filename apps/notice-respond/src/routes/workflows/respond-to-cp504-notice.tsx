import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/cp504-response */
export const Route = createFileRoute("/workflows/respond-to-cp504-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/cp504-response" }); },
  component: () => null,
});
