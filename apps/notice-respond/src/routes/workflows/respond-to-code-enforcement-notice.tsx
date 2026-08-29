import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/code-enforcement */
export const Route = createFileRoute("/workflows/respond-to-code-enforcement-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/code-enforcement" }); },
  component: () => null,
});
