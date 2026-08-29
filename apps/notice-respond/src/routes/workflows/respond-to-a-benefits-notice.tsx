import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/benefits-notice */
export const Route = createFileRoute("/workflows/respond-to-a-benefits-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/benefits-notice" }); },
  component: () => null,
});
