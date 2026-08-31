import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/ssa-notice */
export const Route = createFileRoute("/workflows/respond-to-an-ssa-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/ssa-notice" }); },
  component: () => null,
});
