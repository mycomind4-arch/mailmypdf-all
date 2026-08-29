import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/start")({
  beforeLoad: ({ location }) => {
    const returnTo = location.search?.returnTo;
    if (returnTo) {
      throw redirect({ to: "/auth", search: { returnTo } });
    }
    throw redirect({ to: "/workflows" });
  },
  component: () => null,
});
