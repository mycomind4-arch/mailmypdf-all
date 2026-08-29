import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/irs-notice */
export const Route = createFileRoute("/workflows/respond-to-an-irs-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/irs-notice" }); },
  component: () => null,
});
