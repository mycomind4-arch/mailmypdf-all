import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/cp2000-response */
export const Route = createFileRoute("/workflows/respond-to-cp2000-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/cp2000-response" }); },
  component: () => null,
});
