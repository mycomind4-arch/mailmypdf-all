import { createFileRoute, redirect } from "@tanstack/react-router";

/** /pricing redirects to /pro — the canonical pricing page */
export const Route = createFileRoute("/pricing")({
  beforeLoad: () => { throw redirect({ to: "/pro" }); },
  component: () => null,
});
