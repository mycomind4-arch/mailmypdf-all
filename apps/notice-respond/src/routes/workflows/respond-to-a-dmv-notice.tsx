import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/dmv-notice */
export const Route = createFileRoute("/workflows/respond-to-a-dmv-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/dmv-notice" }); },
  component: () => null,
});
