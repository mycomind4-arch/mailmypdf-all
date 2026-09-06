import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility alias for the former /solutions namespace. */
export const Route = createFileRoute("/solutions/appeal-reply")({
  beforeLoad: () => {
    throw redirect({ to: "/appeal-mail" });
  },
  component: () => null,
});
