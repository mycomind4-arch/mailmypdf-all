import { createFileRoute, Outlet } from "@tanstack/react-router";

// This is the parent layout route for /solutions and all /solutions/* child routes.
// It renders an Outlet so child routes (index, gov-reply, appeal-reply, $verticalSlug)
// can render their own content.
export const Route = createFileRoute("/solutions")({
  component: () => <Outlet />,
});
