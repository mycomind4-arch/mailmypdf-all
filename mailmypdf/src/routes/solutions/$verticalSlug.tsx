import { createFileRoute, redirect } from "@tanstack/react-router";
import { getVerticalBySlug } from "@/verticals";

/** Compatibility route for links created under the former /solutions namespace. */
export const Route = createFileRoute("/solutions/$verticalSlug")({
  beforeLoad: ({ params }) => {
    const vertical = getVerticalBySlug(params.verticalSlug);
    throw redirect({ to: vertical?.route ?? "/solutions" });
  },
  component: () => null,
});
