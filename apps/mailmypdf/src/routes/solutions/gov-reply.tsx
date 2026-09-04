import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility alias for the former /solutions namespace. */
export const Route = createFileRoute("/solutions/gov-reply")({
  beforeLoad: () => {
    throw redirect({ to: "/govreply" });
  },
  component: () => null,
});
