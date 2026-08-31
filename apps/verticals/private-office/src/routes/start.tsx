import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/start")({
  beforeLoad: ({ search }) => {
    const returnTo = (search as { returnTo?: string })?.returnTo;
    if (returnTo) {
      throw redirect({ to: "/auth", search: { returnTo } });
    }
    throw redirect({ to: "/workflows" });
  },
  component: () => null,
});
