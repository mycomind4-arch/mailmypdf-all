import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/tax-notice */
export const Route = createFileRoute("/workflows/respond-to-a-tax-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/tax-notice" }); },
  component: () => null,
});
