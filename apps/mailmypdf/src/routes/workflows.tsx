import { createFileRoute, redirect } from "@tanstack/react-router";

/** /workflows redirects to /ecosystem — the canonical product catalog */
export const Route = createFileRoute("/workflows")({
  beforeLoad: () => { throw redirect({ to: "/ecosystem" }); },
  component: () => null,
});
