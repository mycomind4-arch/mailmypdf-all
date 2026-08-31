import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/court-summons */
export const Route = createFileRoute("/workflows/respond-to-a-court-summons")({
  beforeLoad: () => { throw redirect({ to: "/workflows/court-summons" }); },
  component: () => null,
});
