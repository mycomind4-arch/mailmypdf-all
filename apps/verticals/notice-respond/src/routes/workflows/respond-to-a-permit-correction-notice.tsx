import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — canonical URL is /workflows/permit-correction */
export const Route = createFileRoute("/workflows/respond-to-a-permit-correction-notice")({
  beforeLoad: () => { throw redirect({ to: "/workflows/permit-correction" }); },
  component: () => null,
});
