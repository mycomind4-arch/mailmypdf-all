import { createFileRoute, Outlet } from "@tanstack/react-router";

// Parent layout for all /legal-defense/* routes. The landing page itself
// lives at legal-defense/index.tsx; this file must render <Outlet /> so
// child routes (workflow directory, workflow detail) are visible.
export const Route = createFileRoute("/legal-defense")({
  component: () => <Outlet />,
});
