import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/uscis-notice */
export const Route = createFileRoute("/workflows/respond-to-a-uscis-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/uscis-notice" }); },
  component: () => null,
});
